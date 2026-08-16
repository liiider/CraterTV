import { searchCanonicalTitlesFromDouban } from '@/lib/douban-search';
import { searchFromApi } from '@/lib/downstream';
import { safeSearchFromApiSites } from '@/lib/safe-search';
import { searchCanonicalTitlesFromTmdb } from '@/lib/tmdb-search';

jest.mock('@/lib/downstream', () => ({
  searchFromApi: jest.fn(),
}));

jest.mock('@/lib/douban-search', () => ({
  searchCanonicalTitlesFromDouban: jest.fn(),
}));

jest.mock('@/lib/tmdb-search', () => ({
  searchCanonicalTitlesFromTmdb: jest.fn(),
}));

const sites = [
  { key: 'one', name: 'One', api: 'https://one.invalid' },
  { key: 'two', name: 'Two', api: 'https://two.invalid' },
];

const result = (source: string, id: string, title: string) => ({
  source,
  source_name: source,
  id,
  title,
  poster: '',
  episodes: [],
  episodes_titles: [],
  year: '2023',
});

describe('safeSearchFromApiSites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue([]);
  });

  it('uses Douban titles without calling TMDB when Douban has results', async () => {
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue(['三体']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site, query) => [
        result(site.key, `${site.key}-allowed`, '三体'),
        result(site.key, `${site.key}-blocked`, `${query}未删减版`),
      ]);

    const results = await safeSearchFromApiSites(sites, '三体', true);

    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledWith('三体');
    expect(searchCanonicalTitlesFromTmdb).not.toHaveBeenCalled();
    expect(results.map((item) => item.id)).toEqual([
      'one-allowed',
      'two-allowed',
    ]);
  });

  it('falls back to TMDB when Douban has no movie or TV results', async () => {
    jest.mocked(searchCanonicalTitlesFromTmdb).mockResolvedValue(['三体']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site, query) => [
        result(site.key, `${site.key}-allowed`, '三体'),
        result(site.key, `${site.key}-blocked`, `${query}未删减版`),
      ]);

    const results = await safeSearchFromApiSites(sites, '三体', true);

    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledWith('三体');
    expect(searchCanonicalTitlesFromTmdb).toHaveBeenCalledWith('三体');
    expect(results.map((item) => item.id)).toEqual([
      'one-allowed',
      'two-allowed',
    ]);
  });

  it('uses a Douban homepage title directly without calling either catalog', async () => {
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue([]);
    jest.mocked(searchCanonicalTitlesFromTmdb).mockResolvedValue([]);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [
        result(site.key, `${site.key}-allowed`, '三体'),
      ]);

    const results = await safeSearchFromApiSites(sites, '三体', true, ['三体']);

    expect(results.map((item) => item.id)).toEqual([
      'one-allowed',
      'two-allowed',
    ]);
    expect(searchCanonicalTitlesFromDouban).not.toHaveBeenCalled();
    expect(searchCanonicalTitlesFromTmdb).not.toHaveBeenCalled();
    expect(searchFromApi).toHaveBeenCalledTimes(2);
  });

  it('fails closed when both catalogs return no canonical titles', async () => {
    jest.mocked(searchCanonicalTitlesFromTmdb).mockResolvedValue([]);

    await expect(safeSearchFromApiSites(sites, '三体', true)).resolves.toEqual(
      []
    );
    expect(searchFromApi).not.toHaveBeenCalled();
  });

  it('keeps normal multi-source search when safe search is disabled', async () => {
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [result(site.key, site.key, '三体')]);

    const results = await safeSearchFromApiSites(sites, '三体', false);

    expect(searchCanonicalTitlesFromTmdb).not.toHaveBeenCalled();
    expect(results).toHaveLength(2);
  });

  it('keeps successful source results when another normal source fails', async () => {
    jest.mocked(searchFromApi).mockImplementation(async (site) => {
      if (site.key === 'one') {
        throw new Error('source unavailable');
      }

      return [result(site.key, site.key, '三体')];
    });

    await expect(safeSearchFromApiSites(sites, '三体', false)).resolves.toEqual(
      [result('two', 'two', '三体')]
    );
  });
});
