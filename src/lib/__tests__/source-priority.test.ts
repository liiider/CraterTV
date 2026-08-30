import {
  findPreferredVideoSource,
  isDyttVideoSource,
  prioritizeVideoSources,
} from '@/lib/source-priority';
import type { SearchResult } from '@/lib/types';

const makeResult = (
  source: string,
  sourceName: string,
  id: string
): SearchResult => ({
  id,
  title: `影片 ${id}`,
  poster: '',
  episodes: [`https://example.com/${id}.m3u8`],
  episodes_titles: ['正片'],
  source,
  source_name: sourceName,
  year: '2026',
});

describe('video source priority', () => {
  it('recognizes Movie Heaven by display name or source key', () => {
    expect(isDyttVideoSource(makeResult('source-a', '电影天堂资源', '1'))).toBe(
      true
    );
    expect(isDyttVideoSource(makeResult('dyttzy', '备用源', '2'))).toBe(true);
    expect(isDyttVideoSource(makeResult('source-b', '普通资源', '3'))).toBe(
      false
    );
  });

  it('moves Movie Heaven results to the front without mutating other order', () => {
    const first = makeResult('source-a', '普通源 A', '1');
    const second = makeResult('source-b', '普通源 B', '2');
    const dytt = makeResult('dyttzy', '电影天堂', '3');
    const original = [first, second, dytt];

    expect(prioritizeVideoSources(original)).toEqual([dytt, first, second]);
    expect(original).toEqual([first, second, dytt]);
  });

  it('selects Movie Heaven for automatic playback when it is available', () => {
    const sources = [
      makeResult('fast-source', '高速源', '1'),
      makeResult('dyttzy', '电影天堂', '2'),
    ];

    expect(findPreferredVideoSource(sources)).toBe(sources[1]);
  });

  it('returns no preferred source when Movie Heaven is unavailable', () => {
    expect(
      findPreferredVideoSource([makeResult('source-a', '普通源', '1')])
    ).toBeUndefined();
  });
});
