import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';
import { safeSearchFromApiSites } from '@/lib/safe-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store',
};

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json(
      { results: [] },
      {
        headers: noStoreHeaders,
      }
    );
  }

  const apiSites = await getAvailableApiSites(authInfo.username);

  try {
    const results = await safeSearchFromApiSites(apiSites, query);

    if (results.length === 0) {
      return NextResponse.json(
        { results: [] },
        { status: 200, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { results },
      {
        headers: noStoreHeaders,
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
