import {
  consumePlaybackHandoff,
  createPlaybackHandoff,
  mergeRefreshedSources,
  resetPlaybackHandoffsForTests,
} from '@/lib/playback-handoff';
import { SearchResult } from '@/lib/types';

const makeResult = (
  source: string,
  id: string,
  overrides: Partial<SearchResult> = {}
): SearchResult => ({
  source,
  id,
  source_name: source,
  title: '舒畅作品',
  poster: '',
  year: '2024',
  episodes: [`https://example.com/${source}/${id}.m3u8`],
  episodes_titles: ['正片'],
  ...overrides,
});

describe('playback handoff', () => {
  beforeEach(() => {
    resetPlaybackHandoffsForTests();
  });

  it('hands complete search results to the matching play route once', () => {
    const token = createPlaybackHandoff(
      {
        query: '舒畅',
        title: '舒畅作品',
        year: '2024',
        type: 'movie',
        catalog: '',
        clickedSource: 'source-a',
        clickedId: '1',
        sources: [makeResult('source-a', '1'), makeResult('source-b', '2')],
        searchComplete: true,
      },
      1_000
    );

    const handoff = consumePlaybackHandoff(
      token,
      {
        query: '舒畅',
        title: ' 舒畅作品 ',
        year: '2024',
        type: 'movie',
        catalog: '',
        source: 'source-a',
        id: '1',
      },
      1_500
    );

    expect(handoff?.searchComplete).toBe(true);
    expect(handoff?.sources).toHaveLength(2);
    expect(
      consumePlaybackHandoff(
        token,
        {
          query: '舒畅',
          title: '舒畅作品',
          year: '2024',
          type: 'movie',
          catalog: '',
          source: 'source-a',
          id: '1',
        },
        1_600
      )
    ).toBeNull();
  });

  it('rejects expired or route-mismatched handoffs', () => {
    const token = createPlaybackHandoff(
      {
        query: '舒畅',
        title: '舒畅作品',
        year: '2024',
        type: 'movie',
        catalog: '',
        sources: [makeResult('source-a', '1')],
        searchComplete: false,
      },
      1_000
    );

    expect(
      consumePlaybackHandoff(
        token,
        {
          query: '另一部作品',
          title: '另一部作品',
          year: '2024',
          type: 'movie',
          catalog: '',
          source: '',
          id: '',
        },
        1_500
      )
    ).toBeNull();

    const expiredToken = createPlaybackHandoff(
      {
        query: '舒畅',
        title: '舒畅作品',
        year: '2024',
        type: 'movie',
        catalog: '',
        sources: [makeResult('source-a', '1')],
        searchComplete: false,
      },
      1_000
    );

    expect(
      consumePlaybackHandoff(
        expiredToken,
        {
          query: '舒畅',
          title: '舒畅作品',
          year: '2024',
          type: 'movie',
          catalog: '',
          source: '',
          id: '',
        },
        61_001
      )
    ).toBeNull();
  });

  it('keeps the active playback detail when refreshed sources arrive', () => {
    const active = makeResult('source-a', '1', {
      episodes: ['https://cached.example.com/active.m3u8'],
    });
    const refreshedActive = makeResult('source-a', '1', {
      episodes: ['https://refresh.example.com/active.m3u8'],
    });
    const refreshedOther = makeResult('source-b', '2');

    const merged = mergeRefreshedSources(
      [refreshedActive, refreshedOther],
      active
    );

    expect(merged).toEqual([active, refreshedOther]);
    expect(merged[0].episodes[0]).toContain('cached.example.com');
  });

  it('retains an active source that a partial refresh did not return', () => {
    const active = makeResult('source-a', '1');
    const refreshedOther = makeResult('source-b', '2');

    expect(mergeRefreshedSources([refreshedOther], active)).toEqual([
      active,
      refreshedOther,
    ]);
  });

  it('accepts an unknown route year for sources with an empty year', () => {
    const token = createPlaybackHandoff(
      {
        query: '旧片',
        title: '旧片',
        year: 'unknown',
        type: 'movie',
        catalog: '',
        sources: [makeResult('source-a', '1', { title: '旧片', year: '' })],
        searchComplete: true,
      },
      1_000
    );

    expect(
      consumePlaybackHandoff(
        token,
        {
          query: '旧片',
          title: '旧片',
          year: 'unknown',
          type: 'movie',
          catalog: '',
          source: '',
          id: '',
        },
        1_500
      )
    ).not.toBeNull();
  });
});
