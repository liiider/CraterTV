import { ApiSite } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';

const MAX_CANONICAL_TITLES = 8;
const SEARCH_TIMEOUT_MS = 20000;

export function normalizeSearchTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[《》「」『』【】()[\]（）_:：,，.。!！?？-]/g, '');
}

function uniqueTitles(results: SearchResult[]) {
  const seen = new Set<string>();
  const titles: string[] = [];

  results.forEach((result) => {
    const title = result.title?.trim();
    if (!title) return;

    const normalized = normalizeSearchTitle(title);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    titles.push(title);
  });

  return titles.slice(0, MAX_CANONICAL_TITLES);
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

export async function getCanonicalSearchTitles(
  safeSite: ApiSite,
  query: string
) {
  const preSearchResults = await searchFromApiSiteWithTimeout(safeSite, query);
  return uniqueTitles(preSearchResults);
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
  safeSite?: ApiSite | null
) {
  if (apiSites.length === 0) {
    return [];
  }

  if (!safeSite) {
    const results = await Promise.all(
      apiSites.map((site) => searchFromApiSiteWithTimeout(site, query))
    );
    return dedupeResults(results.flat());
  }

  const canonicalTitles = await getCanonicalSearchTitles(safeSite, query);
  if (canonicalTitles.length === 0) {
    return [];
  }

  const results = await Promise.all(
    apiSites.map((site) => searchExactTitlesFromSite(site, canonicalTitles))
  );

  return dedupeResults(results.flat());
}
