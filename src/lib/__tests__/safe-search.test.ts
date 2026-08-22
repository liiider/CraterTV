import { searchCanonicalTitlesFromDouban } from '@/lib/douban-search';
import { searchFromApi } from '@/lib/downstream';
import {
  SAFE_SEARCH_VALIDATION_CONCURRENCY,
  safeSearchFromApiSites,
} from '@/lib/safe-search';
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

const result = (source: string, id: string, title: string, year = '2023') => ({
  source,
  source_name: source,
  id,
  title,
  poster: '',
  episodes: [],
  episodes_titles: [],
  year,
});

describe('safeSearchFromApiSites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue([]);
  });

  it('searches every site once with the original query and validates returned titles', async () => {
    jest
      .mocked(searchCanonicalTitlesFromDouban)
      .mockResolvedValue(['不要抬头']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [
        result(site.key, `${site.key}-allowed`, '不要抬头'),
      ]);

    const results = await safeSearchFromApiSites(sites, '不要台头', true);

    expect(searchFromApi).toHaveBeenCalledTimes(2);
    expect(searchFromApi).toHaveBeenNthCalledWith(1, sites[0], '不要台头');
    expect(searchFromApi).toHaveBeenNthCalledWith(2, sites[1], '不要台头');
    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledTimes(1);
    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledWith('不要抬头');
    expect(searchCanonicalTitlesFromTmdb).not.toHaveBeenCalled();
    expect(results.map((item) => item.id)).toEqual([
      'one-allowed',
      'two-allowed',
    ]);
  });

  it('falls back to TMDB when Douban does not exactly match the returned title', async () => {
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue(['三体2']);
    jest.mocked(searchCanonicalTitlesFromTmdb).mockResolvedValue(['三体']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [result(site.key, site.key, '三体')]);

    const results = await safeSearchFromApiSites(sites, '三休', true);

    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledWith('三体');
    expect(searchCanonicalTitlesFromTmdb).toHaveBeenCalledWith('三体');
    expect(results).toHaveLength(2);
  });

  it('hides returned titles that neither catalog exactly matches', async () => {
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue(['三体']);
    jest.mocked(searchCanonicalTitlesFromTmdb).mockResolvedValue([]);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [
        result(site.key, site.key, '三体未删减版'),
      ]);

    const results = await safeSearchFromApiSites(sites, '三体', true);

    expect(results).toEqual([]);
    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledWith(
      '三体未删减版'
    );
    expect(searchCanonicalTitlesFromTmdb).toHaveBeenCalledWith('三体未删减版');
  });

  it('normalizes common punctuation when matching catalog titles', async () => {
    jest
      .mocked(searchCanonicalTitlesFromDouban)
      .mockResolvedValue(['不要抬头']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [
        result(site.key, site.key, '《不要抬头》'),
      ]);

    const results = await safeSearchFromApiSites(sites, '不要抬头', true);

    expect(results).toHaveLength(2);
    expect(searchCanonicalTitlesFromTmdb).not.toHaveBeenCalled();
  });

  it('validates the same normalized title and year only once', async () => {
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue(['三体']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [
        result(
          site.key,
          site.key,
          site.key === 'one' ? '《三体》' : '三 体',
          '2023'
        ),
      ]);

    await expect(
      safeSearchFromApiSites(sites, '三休', true)
    ).resolves.toHaveLength(2);
    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledTimes(1);
  });

  it('validates identical titles from different years separately', async () => {
    jest.mocked(searchCanonicalTitlesFromDouban).mockResolvedValue(['三体']);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [
        result(
          site.key,
          site.key,
          '三体',
          site.key === 'one' ? '2023' : '2024'
        ),
      ]);

    await expect(
      safeSearchFromApiSites(sites, '三体', true)
    ).resolves.toHaveLength(2);
    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledTimes(2);
  });

  it('limits concurrent catalog validations', async () => {
    const releases: Array<() => void> = [];
    const manyResults = Array.from(
      { length: SAFE_SEARCH_VALIDATION_CONCURRENCY + 1 },
      (_, index) => result('one', String(index), `标题${index}`)
    );

    jest.mocked(searchFromApi).mockResolvedValue(manyResults);
    jest.mocked(searchCanonicalTitlesFromDouban).mockImplementation(
      (title) =>
        new Promise((resolve) => {
          releases.push(() => resolve([title]));
        })
    );

    const searchPromise = safeSearchFromApiSites(
      [sites[0]],
      '原始关键词',
      true
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledTimes(
      SAFE_SEARCH_VALIDATION_CONCURRENCY
    );

    releases.splice(0).forEach((release) => release());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchCanonicalTitlesFromDouban).toHaveBeenCalledTimes(
      SAFE_SEARCH_VALIDATION_CONCURRENCY + 1
    );

    releases.splice(0).forEach((release) => release());
    await expect(searchPromise).resolves.toHaveLength(manyResults.length);
  });

  it('fails closed when catalog validation fails', async () => {
    jest
      .mocked(searchCanonicalTitlesFromDouban)
      .mockRejectedValue(new Error('catalog unavailable'));
    jest.mocked(searchCanonicalTitlesFromTmdb).mockResolvedValue([]);
    jest
      .mocked(searchFromApi)
      .mockImplementation(async (site) => [result(site.key, site.key, '三体')]);

    await expect(safeSearchFromApiSites(sites, '三体', true)).resolves.toEqual(
      []
    );
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

  it('does not start every normal source at the same time', async () => {
    const manySites = Array.from({ length: 17 }, (_, index) => ({
      key: `site-${index}`,
      name: `Site ${index}`,
      api: `https://site-${index}.invalid`,
    }));
    const releases: Array<() => void> = [];

    jest.mocked(searchFromApi).mockImplementation(
      (site) =>
        new Promise((resolve) => {
          releases.push(() => resolve([result(site.key, site.key, '三体')]));
        })
    );

    const searchPromise = safeSearchFromApiSites(manySites, '三体', false);
    await Promise.resolve();

    expect(searchFromApi).toHaveBeenCalledTimes(16);

    releases.splice(0, 16).forEach((release) => release());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchFromApi).toHaveBeenCalledTimes(17);

    releases.forEach((release) => release());
    await expect(searchPromise).resolves.toHaveLength(17);
  });
});
