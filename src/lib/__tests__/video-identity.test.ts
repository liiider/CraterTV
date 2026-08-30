import type { SearchResult } from '@/lib/types';
import { matchesPlaybackTarget } from '@/lib/video-identity';

function createResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'movie-1',
    title: '火遮眼2025',
    poster: '',
    episodes: ['https://example.com/movie.m3u8'],
    episodes_titles: ['正片'],
    source: 'dytt',
    source_name: '电影天堂',
    year: '2025',
    douban_id: 36877245,
    ...overrides,
  };
}

describe('matchesPlaybackTarget', () => {
  it('accepts the result when valid Douban IDs match despite metadata differences', () => {
    const result = createResult({
      title: '完全不同的来源标题',
      year: 'unknown',
      episodes: ['episode-1', 'episode-2'],
    });

    expect(
      matchesPlaybackTarget(result, {
        title: '火遮眼',
        year: '2025',
        type: 'movie',
        doubanId: 36877245,
      })
    ).toBe(true);
  });

  it('keeps the existing title, year and type rules when Douban IDs do not match', () => {
    expect(
      matchesPlaybackTarget(createResult(), {
        title: '火遮眼',
        year: '2025',
        type: 'movie',
        doubanId: 99999999,
      })
    ).toBe(false);
  });

  it('preserves an existing metadata match when Douban IDs are unavailable', () => {
    expect(
      matchesPlaybackTarget(
        createResult({ title: '火遮眼', douban_id: undefined }),
        {
          title: '火遮眼',
          year: '2025',
          type: 'movie',
        }
      )
    ).toBe(true);
  });

  it('does not treat missing or zero Douban IDs as a match', () => {
    expect(
      matchesPlaybackTarget(createResult({ douban_id: 0 }), {
        title: '火遮眼',
        year: '2025',
        type: 'movie',
        doubanId: 0,
      })
    ).toBe(false);
  });
});
