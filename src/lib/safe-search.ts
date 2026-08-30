import { ApiSite } from '@/lib/config';
import { searchCanonicalTitlesFromDouban } from '@/lib/douban-search';
import { searchFromApi } from '@/lib/downstream';
import { partitionVideoSourcesByPreference } from '@/lib/source-priority';
import { runInBatches } from '@/lib/source-validation';
import { searchCanonicalTitlesFromTmdb } from '@/lib/tmdb-search';
import { SearchResult } from '@/lib/types';

const SEARCH_TIMEOUT_MS = 20000;
export const SEARCH_BATCH_SIZE = 16;
export const SAFE_SEARCH_VALIDATION_CONCURRENCY = 8;

export function normalizeSearchTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[《》「」『』【】()[\]（）_:：,，.。!！?？-]/g, '');
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.source}:${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchFromApiSiteWithTimeout(
  site: ApiSite,
  query: string
) {
  return Promise.race([
    searchFromApi(site, query),
    new Promise<SearchResult[]>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${site.name} timeout`)),
        SEARCH_TIMEOUT_MS
      )
    ),
  ]);
}

function containsExactTitle(titles: string[], normalizedTitle: string) {
  return titles.some(
    (title) => normalizeSearchTitle(title) === normalizedTitle
  );
}

async function verifySafeSearchResult(result: SearchResult) {
  if (
    typeof result.douban_id === 'number' &&
    Number.isInteger(result.douban_id) &&
    result.douban_id > 0
  ) {
    return true;
  }

  const title = result.title?.trim();
  const normalizedTitle = normalizeSearchTitle(title || '');
  if (!title || !normalizedTitle) return false;

  try {
    const doubanTitles = await searchCanonicalTitlesFromDouban(title);
    if (containsExactTitle(doubanTitles, normalizedTitle)) return true;
  } catch {
    // Treat an unavailable catalog as no match and continue to TMDB.
  }

  try {
    const tmdbTitles = await searchCanonicalTitlesFromTmdb(title);
    return containsExactTitle(tmdbTitles, normalizedTitle);
  } catch {
    return false;
  }
}

export type SafeSearchResultVerifier = (
  result: SearchResult
) => Promise<boolean>;

function createValidationScheduler(maxConcurrent: number) {
  let activeCount = 0;
  const pendingTasks: Array<() => void> = [];

  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const execute = async () => {
        activeCount++;
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        } finally {
          activeCount--;
          pendingTasks.shift()?.();
        }
      };

      if (activeCount < maxConcurrent) {
        void execute();
      } else {
        pendingTasks.push(() => void execute());
      }
    });
}

export function createSafeSearchResultVerifier(): SafeSearchResultVerifier {
  const validations = new Map<string, Promise<boolean>>();
  const scheduleValidation = createValidationScheduler(
    SAFE_SEARCH_VALIDATION_CONCURRENCY
  );

  return (result) => {
    const normalizedTitle = normalizeSearchTitle(result.title || '');
    if (!normalizedTitle) return Promise.resolve(false);

    const key = `${normalizedTitle}:${result.year || 'unknown'}`;
    let validation = validations.get(key);
    if (!validation) {
      validation = scheduleValidation(() => verifySafeSearchResult(result));
      validations.set(key, validation);
    }

    return validation;
  };
}

export async function filterSafeSearchResults(
  results: SearchResult[],
  verifyResult: SafeSearchResultVerifier = createSafeSearchResultVerifier()
) {
  const verdicts = await Promise.all(results.map(verifyResult));
  return results.filter((_, index) => verdicts[index]);
}

export async function safeSearchFromApiSites(
  apiSites: ApiSite[],
  query: string,
  safeSearchEnabled = false
) {
  if (apiSites.length === 0) return [];

  const { preferred, others } = partitionVideoSourcesByPreference(apiSites);
  const results: PromiseSettledResult<SearchResult[]>[] = [];

  if (preferred.length > 0) {
    results.push(
      ...(await runInBatches(preferred, SEARCH_BATCH_SIZE, (site) =>
        searchFromApiSiteWithTimeout(site, query)
      ))
    );
  }

  if (others.length > 0) {
    results.push(
      ...(await runInBatches(others, SEARCH_BATCH_SIZE, (site) =>
        searchFromApiSiteWithTimeout(site, query)
      ))
    );
  }
  const dedupedResults = dedupeResults(
    results
      .filter(
        (result): result is PromiseFulfilledResult<SearchResult[]> =>
          result.status === 'fulfilled'
      )
      .flatMap((result) => result.value)
  );

  if (!safeSearchEnabled) return dedupedResults;
  return filterSafeSearchResults(dedupedResults);
}
