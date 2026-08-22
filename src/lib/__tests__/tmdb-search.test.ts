import { searchCanonicalTitlesFromTmdb } from '@/lib/tmdb-search';

describe('searchCanonicalTitlesFromTmdb', () => {
  it('returns unique localized and original titles for non-adult movies and TV shows', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            media_type: 'movie',
            adult: false,
            title: '三体',
            original_title: 'Three-Body',
          },
          {
            media_type: 'tv',
            adult: false,
            name: '三体',
            original_name: 'Three-Body',
          },
          { media_type: 'person', name: '刘慈欣' },
          {
            media_type: 'movie',
            adult: true,
            title: '不应放行',
          },
        ],
      }),
    });

    await expect(
      searchCanonicalTitlesFromTmdb('三体', {
        token: 'test-token',
        fetchImpl: fetchMock,
      })
    ).resolves.toEqual(['三体', 'Three-Body']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/search/multi');
    expect(url).toContain('query=%E4%B8%89%E4%BD%93');
    expect(url).toContain('include_adult=false');
    expect(url).toContain('language=zh-CN');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('fails closed when the token is missing', async () => {
    const fetchMock = jest.fn();

    await expect(
      searchCanonicalTitlesFromTmdb('三体', {
        token: '',
        fetchImpl: fetchMock,
      })
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when TMDB rejects the request', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });

    await expect(
      searchCanonicalTitlesFromTmdb('三体', {
        token: 'test-token',
        fetchImpl: fetchMock,
      })
    ).resolves.toEqual([]);
  });

  it('keeps all non-adult titles for exact result validation', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          ...Array.from({ length: 8 }, (_, index) => ({
            media_type: 'movie',
            adult: false,
            title: `相似结果${index}`,
          })),
          {
            media_type: 'movie',
            adult: false,
            title: '目标标题',
          },
        ],
      }),
    });

    await expect(
      searchCanonicalTitlesFromTmdb('目标标题', {
        token: 'test-token',
        fetchImpl: fetchMock,
      })
    ).resolves.toContain('目标标题');
  });
});
