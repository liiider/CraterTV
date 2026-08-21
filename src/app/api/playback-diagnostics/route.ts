/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { sanitizePlaybackUrl } from '@/lib/playback-diagnostics';

export const runtime = 'nodejs';

const allowedEvents = new Set([
  'playback_stall_detected',
  'hls_fatal_error',
  'player_error',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeLogValue(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    const sanitized = /url$/i.test(key) ? sanitizePlaybackUrl(value) : value;
    return sanitized.slice(0, 2000);
  }
  if (Array.isArray(value)) {
    return value.slice(-50).map((item) => sanitizeLogValue(item));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeLogValue(entryValue, entryKey),
        ])
    );
  }
  return value;
}

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 64 * 1024) {
      return NextResponse.json(
        { error: 'Invalid diagnostic payload' },
        { status: 400 }
      );
    }

    const body: unknown = JSON.parse(rawBody);
    if (!isObject(body) || !allowedEvents.has(String(body.event))) {
      return NextResponse.json(
        { error: 'Invalid diagnostic event' },
        { status: 400 }
      );
    }

    const recentEvents = Array.isArray(body.recentEvents)
      ? body.recentEvents.filter(isObject).slice(-50)
      : [];

    console.error(
      '[playback-diagnostic]',
      JSON.stringify({
        receivedAt: new Date().toISOString(),
        username: authInfo.username,
        userAgent: request.headers.get('user-agent') || '',
        event: body.event,
        context: sanitizeLogValue(isObject(body.context) ? body.context : {}),
        recentEvents: sanitizeLogValue(recentEvents),
      })
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('接收播放诊断失败', error);
    return NextResponse.json(
      { error: 'Invalid diagnostic payload' },
      { status: 400 }
    );
  }
}
