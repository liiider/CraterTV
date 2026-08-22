const DOUBAN_SUGGEST_URLS = [
  'https://movie.douban.cmliussss.net/j/subject_suggest',
  'https://movie.douban.com/j/subject_suggest',
] as const;
const DOUBAN_SEARCH_TIMEOUT_MS = 8000;

interface DoubanSuggestItem {
  type?: unknown;
  title?: unknown;
}

interface FetchResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

type FetchImplementation = (
  input: string,
  init?: RequestInit
) => Promise<FetchResponse>;

interface DoubanSearchOptions {
  fetchImpl?: FetchImplementation;
}

function isDoubanSuggestItem(value: unknown): value is DoubanSuggestItem {
  return typeof value === 'object' && value !== null;
}

function extractCanonicalTitles(payload: unknown) {
  if (!Array.isArray(payload)) return [];

  const titles: string[] = [];
  const normalizedTitles = new Set<string>();

  for (const value of payload) {
    if (!isDoubanSuggestItem(value)) continue;
    if (value.type !== 'movie' && value.type !== 'tv') continue;
    if (typeof value.title !== 'string') continue;

    const title = value.title.trim();
    const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
    if (!normalizedTitle || normalizedTitles.has(normalizedTitle)) continue;

    normalizedTitles.add(normalizedTitle);
    titles.push(title);
  }

  return titles;
}

export async function searchCanonicalTitlesFromDouban(
  query: string,
  options: DoubanSearchOptions = {}
): Promise<string[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DOUBAN_SEARCH_TIMEOUT_MS
  );
  const params = new URLSearchParams({ q: query });

  try {
    for (const suggestUrl of DOUBAN_SUGGEST_URLS) {
      try {
        const response = await fetchImpl(`${suggestUrl}?${params}`, {
          headers: {
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://movie.douban.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });

        if (!response.ok) continue;
        const titles = extractCanonicalTitles(await response.json());
        if (titles.length > 0) return titles;
      } catch {
        // Try the next fixed endpoint when the current one is unavailable.
      }
    }

    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
