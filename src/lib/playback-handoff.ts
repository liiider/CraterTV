import { SearchResult } from '@/lib/types';

const PLAYBACK_HANDOFF_TTL_MS = 60_000;

export interface PlaybackHandoffInput {
  query: string;
  title: string;
  year: string;
  type: string;
  catalog: string;
  clickedSource?: string;
  clickedId?: string;
  sources: SearchResult[];
  searchComplete: boolean;
}

export interface PlaybackHandoff extends PlaybackHandoffInput {
  createdAt: number;
}

export interface PlaybackHandoffExpectation {
  query: string;
  title: string;
  year: string;
  type: string;
  catalog: string;
  source: string;
  id: string;
}

export interface PlaybackHandoffSelection {
  query: string;
  title: string;
  year: string;
  type: string;
  catalog: string;
  source?: string;
  id?: string;
}

const playbackHandoffs = new Map<string, PlaybackHandoff>();

const normalizeTitle = (value: string) =>
  value.trim().replace(/\s+/g, '').toLowerCase();

const normalizeYear = (value: string) => value || 'unknown';

const getResultType = (result: SearchResult) =>
  result.episodes.length === 1 ? 'movie' : 'tv';

const isValidSearchResult = (value: SearchResult) =>
  Boolean(
    value &&
      typeof value.id === 'string' &&
      typeof value.source === 'string' &&
      typeof value.title === 'string' &&
      typeof value.year === 'string' &&
      Array.isArray(value.episodes) &&
      value.episodes.length > 0 &&
      value.episodes.every((episode) => typeof episode === 'string') &&
      Array.isArray(value.episodes_titles)
  );

const cloneResult = (result: SearchResult): SearchResult => ({
  ...result,
  episodes: [...result.episodes],
  episodes_titles: [...result.episodes_titles],
});

const matchesExpectedRoute = (
  handoff: PlaybackHandoff,
  expected: PlaybackHandoffExpectation
) => {
  if (
    normalizeTitle(handoff.query) !== normalizeTitle(expected.query) ||
    normalizeTitle(handoff.title) !== normalizeTitle(expected.title) ||
    normalizeYear(handoff.year) !== normalizeYear(expected.year) ||
    handoff.type !== expected.type ||
    handoff.catalog !== expected.catalog
  ) {
    return false;
  }

  if (expected.source || expected.id) {
    return (
      handoff.clickedSource === expected.source &&
      handoff.clickedId === expected.id &&
      handoff.sources.some(
        (source) =>
          source.source === expected.source && source.id === expected.id
      )
    );
  }

  return !handoff.clickedSource && !handoff.clickedId;
};

const isInternallyConsistent = (handoff: PlaybackHandoff) =>
  handoff.sources.length > 0 &&
  handoff.sources.every(
    (source) =>
      isValidSearchResult(source) &&
      normalizeTitle(source.title) === normalizeTitle(handoff.title) &&
      normalizeYear(source.year) === normalizeYear(handoff.year) &&
      getResultType(source) === handoff.type
  );

const createToken = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const removeExpiredHandoffs = (now: number) => {
  playbackHandoffs.forEach((handoff, token) => {
    if (now - handoff.createdAt > PLAYBACK_HANDOFF_TTL_MS) {
      playbackHandoffs.delete(token);
    }
  });
};

export function createPlaybackHandoff(
  input: PlaybackHandoffInput,
  now = Date.now()
) {
  removeExpiredHandoffs(now);

  const token = createToken();
  playbackHandoffs.set(token, {
    ...input,
    sources: input.sources.map(cloneResult),
    createdAt: now,
  });
  return token;
}

export function consumePlaybackHandoff(
  token: string,
  expected: PlaybackHandoffExpectation,
  now = Date.now()
): PlaybackHandoff | null {
  if (!token) return null;

  const handoff = playbackHandoffs.get(token);
  playbackHandoffs.delete(token);

  if (
    !handoff ||
    now - handoff.createdAt > PLAYBACK_HANDOFF_TTL_MS ||
    !isInternallyConsistent(handoff) ||
    !matchesExpectedRoute(handoff, expected)
  ) {
    return null;
  }

  return handoff;
}

export function mergeRefreshedSources(
  refreshedSources: SearchResult[],
  activeDetail: SearchResult
) {
  const seen = new Set<string>();
  const merged = refreshedSources
    .filter((source) => {
      const key = `${source.source}:${source.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((source) =>
      source.source === activeDetail.source && source.id === activeDetail.id
        ? activeDetail
        : source
    );

  const containsActive = merged.some(
    (source) =>
      source.source === activeDetail.source && source.id === activeDetail.id
  );

  return containsActive ? merged : [activeDetail, ...merged];
}

export function resetPlaybackHandoffsForTests() {
  playbackHandoffs.clear();
}
