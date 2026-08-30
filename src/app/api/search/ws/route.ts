/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, isSafeSearchEnabledForUser } from '@/lib/config';
import {
  createSafeSearchResultVerifier,
  filterSafeSearchResults,
  SEARCH_BATCH_SIZE,
  searchFromApiSiteWithTimeout,
} from '@/lib/safe-search';
import { partitionVideoSourcesByPreference } from '@/lib/source-priority';
import { runInBatches } from '@/lib/source-validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return new Response(JSON.stringify({ error: '搜索关键词不能为空' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const [apiSites, safeSearchEnabled] = await Promise.all([
    getAvailableApiSites(authInfo.username),
    isSafeSearchEnabledForUser(authInfo.username),
  ]);
  let streamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (data: Uint8Array) => {
        try {
          if (
            streamClosed ||
            (!controller.desiredSize && controller.desiredSize !== 0)
          ) {
            return false;
          }
          controller.enqueue(data);
          return true;
        } catch (error) {
          console.warn('Failed to enqueue data:', error);
          streamClosed = true;
          return false;
        }
      };

      const sendEvent = (payload: Record<string, unknown>) =>
        safeEnqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      if (
        !sendEvent({
          type: 'start',
          query,
          totalSources: apiSites.length,
          timestamp: Date.now(),
        })
      ) {
        return;
      }

      if (apiSites.length === 0) {
        sendEvent({
          type: 'complete',
          totalResults: 0,
          completedSources: 0,
          timestamp: Date.now(),
        });
        controller.close();
        return;
      }

      let completedSources = 0;
      const allResults: unknown[] = [];
      const verifyResult = safeSearchEnabled
        ? createSafeSearchResultVerifier()
        : null;

      const searchSite = async (site: (typeof apiSites)[number]) => {
        try {
          const sourceResults = await searchFromApiSiteWithTimeout(site, query);
          const results = verifyResult
            ? await filterSafeSearchResults(sourceResults, verifyResult)
            : sourceResults;
          completedSources++;

          if (!streamClosed) {
            if (
              !sendEvent({
                type: 'source_result',
                source: site.key,
                sourceName: site.name,
                results,
                timestamp: Date.now(),
              })
            ) {
              streamClosed = true;
              return;
            }
          }

          if (results.length > 0) {
            allResults.push(...results);
          }
        } catch (error) {
          console.warn(`搜索失败 ${site.name}:`, error);
          completedSources++;

          if (!streamClosed) {
            if (
              !sendEvent({
                type: 'source_error',
                source: site.key,
                sourceName: site.name,
                error: error instanceof Error ? error.message : '搜索失败',
                timestamp: Date.now(),
              })
            ) {
              streamClosed = true;
              return;
            }
          }
        }

        if (completedSources === apiSites.length && !streamClosed) {
          if (
            sendEvent({
              type: 'complete',
              totalResults: allResults.length,
              completedSources,
              timestamp: Date.now(),
            })
          ) {
            try {
              controller.close();
            } catch (error) {
              console.warn('Failed to close controller:', error);
            }
          }
        }
      };

      const { preferred, others } = partitionVideoSourcesByPreference(apiSites);
      if (preferred.length > 0) {
        await runInBatches(preferred, SEARCH_BATCH_SIZE, searchSite);
      }
      if (!streamClosed && others.length > 0) {
        await runInBatches(others, SEARCH_BATCH_SIZE, searchSite);
      }
    },

    cancel() {
      streamClosed = true;
      console.log('Client disconnected, cancelling search stream');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
