import { searchCanonicalTitlesFromDouban } from '@/lib/douban-search';

describe('searchCanonicalTitlesFromDouban', () => {
  it('returns unique movie and TV titles only', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', type: 'movie', title: '三体' },
        { id: '2', type: 'tv', title: '三体' },
        { id: '3', type: 'movie', title: '流浪地球' },
        { id: '4', type: 'book', title: '三体' },
        { id: '5', type: 'music', title: '三体配乐' },
      ],
    });

    await expect(
      searchCanonicalTitlesFromDouban('三体', { fetchImpl: fetchMock })
    ).resolves.toEqual(['三体', '流浪地球']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/j/subject_suggest');
    expect(url).toContain('q=%E4%B8%89%E4%BD%93');
    expect(init.headers.Referer).toBe('https://movie.douban.com/');
  });

  it('returns an empty list when Douban is unavailable', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(
      searchCanonicalTitlesFromDouban('三体', { fetchImpl: fetchMock })
    ).resolves.toEqual([]);
  });
});
