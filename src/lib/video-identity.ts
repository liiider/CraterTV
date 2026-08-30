import type { SearchResult } from '@/lib/types';

export interface PlaybackTarget {
  title: string;
  year: string;
  type: string;
  doubanId?: number;
}

function isValidDoubanId(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function normalizeLegacyTitle(title: string) {
  return title.replaceAll(' ', '').toLowerCase();
}

export function matchesPlaybackTarget(
  result: SearchResult,
  target: PlaybackTarget
) {
  if (
    isValidDoubanId(target.doubanId) &&
    isValidDoubanId(result.douban_id) &&
    result.douban_id === target.doubanId
  ) {
    return true;
  }

  return (
    normalizeLegacyTitle(result.title) === normalizeLegacyTitle(target.title) &&
    (target.year
      ? (result.year || 'unknown').toLowerCase() === target.year.toLowerCase()
      : true) &&
    (target.type
      ? (target.type === 'tv' && result.episodes.length > 1) ||
        (target.type === 'movie' && result.episodes.length === 1)
      : true)
  );
}
