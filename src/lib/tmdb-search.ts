const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_SEARCH_TIMEOUT_MS = 8000;

interface TmdbSearchItem {
  media_type?: unknown;
  adult?: unknown;
  title?: unknown;
  original_title?: unknown;
  name?: unknown;
  original_name?: unknown;
}

interface TmdbSearchResponse {
  results?: unknown;
}

interface FetchResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

type FetchImplementation = (
  input: string,
  init?: RequestInit
) => Promise<FetchResponse>;

interface TmdbSearchOptions {
  token?: string;
  fetchImpl?: FetchImplementation;
}

function isTmdbSearchItem(value: unknown): value is TmdbSearchItem {
  return typeof value === 'object' && value !== null;
}

function addUniqueTitle(
  titles: string[],
  normalizedTitles: Set<string>,
  value: unknown
) {
  if (typeof value !== 'string') return;

  const title = value.trim();
  const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
  if (!normalizedTitle || normalizedTitles.has(normalizedTitle)) return;

  normalizedTitles.add(normalizedTitle);
  titles.push(title);
}

function extractCanonicalTitles(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) return [];

  const { results } = payload as TmdbSearchResponse;
  if (!Array.isArray(results)) return [];

  const titles: string[] = [];
  const normalizedTitles = new Set<string>();

  for (const value of results) {
    if (!isTmdbSearchItem(value)) continue;
    if (value.media_type !== 'movie' && value.media_type !== 'tv') continue;
    if (value.adult === true) continue;

    if (value.media_type === 'movie') {
      addUniqueTitle(titles, normalizedTitles, value.title);
      addUniqueTitle(titles, normalizedTitles, value.original_title);
    } else {
      addUniqueTitle(titles, normalizedTitles, value.name);
      addUniqueTitle(titles, normalizedTitles, value.original_name);
    }
  }

  return titles;
}

export async function searchCanonicalTitlesFromTmdb(
  query: string,
  options: TmdbSearchOptions = {}
): Promise<string[]> {
  const token = options.token ?? process.env.TMDB_API_READ_TOKEN?.trim();
  if (!token) return [];

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TMDB_SEARCH_TIMEOUT_MS
  );
  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'zh-CN',
    page: '1',
  });

  try {
    const response = await fetchImpl(
      `${TMDB_API_BASE_URL}/search/multi?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) return [];
    return extractCanonicalTitles(await response.json());
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
