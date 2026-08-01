import { ApiSite } from '@/lib/config';
import { searchCanonicalTitlesFromDouban } from '@/lib/douban-search';
import { searchFromApi } from '@/lib/downstream';
import { searchCanonicalTitlesFromTmdb } from '@/lib/tmdb-search';
import { SearchResult } from '@/lib/types';

const SEARCH_TIMEOUT_MS = 20000;

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

export async function getCanonicalSearchTitles(query: string) {
  const doubanTitles = await searchCanonicalTitlesFromDouban(query);
  if (doubanTitles.length > 0) return doubanTitles;

  return searchCanonicalTitlesFromTmdb(query);
}

export async function searchExactTitlesFromSite(
  site: ApiSite,
  titles: string[]
) {
  const results = await Promise.all(
    titles.map(async (title) => {
      const normalizedTitle = normalizeSearchTitle(title);
      const siteResults = await searchFromApiSiteWithTimeout(site, title);
      return siteResults.filter(
        (result) => normalizeSearchTitle(result.title || '') === normalizedTitle
      );
    })
  );

  return dedupeResults(results.flat());
}

export async function safeSearchFromApiSites(
  apiSites: ApiSite[],
  query: string,
  safeSearchEnabled = false,
  trustedCanonicalTitles?: string[]
) {
  if (apiSites.length === 0) return [];

  if (!safeSearchEnabled) {
    const results = await Promise.all(
      apiSites.map((site) => searchFromApiSiteWithTimeout(site, query))
    );
    return dedupeResults(results.flat());
  }

  const canonicalTitles =
    trustedCanonicalTitles && trustedCanonicalTitles.length > 0
      ? trustedCanonicalTitles
      : await getCanonicalSearchTitles(query);
  if (canonicalTitles.length === 0) return [];

  const results = await Promise.all(
    apiSites.map((site) => searchExactTitlesFromSite(site, canonicalTitles))
  );

  return dedupeResults(results.flat());
}
