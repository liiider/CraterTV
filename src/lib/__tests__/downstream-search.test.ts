import { getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

jest.mock('@/lib/config', () => ({
  API_CONFIG: {
    search: {
      path: '?ac=videolist&wd=',
      pagePath: '?ac=videolist&wd={query}&pg={page}',
      headers: {},
    },
    detail: {
      path: '?ac=videolist&ids=',
      headers: {},
    },
  },
  getConfig: jest.fn(),
}));

const site = {
  key: 'dyttzyapi.com',
  name: '电影天堂',
  api: 'https://example.com/api.php/provide/vod/',
};

const successfulPayload = {
  list: [
    {
      vod_id: 8047,
      vod_name: '进击的巨人第一季',
      vod_pic: '',
      vod_year: '2013',
      vod_douban_id: 23748525,
      vod_play_url: '第01集$https://example.com/episode-1.m3u8',
    },
  ],
  pagecount: 1,
};

describe('searchFromApi without result caching', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getConfig).mockResolvedValue({
      SiteConfig: { SearchDownstreamMaxPage: 1 },
    } as Awaited<ReturnType<typeof getConfig>>);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('requests the source again after a successful result', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => successfulPayload,
    });
    global.fetch = fetchMock;

    await expect(searchFromApi(site, '进击的巨人第一季')).resolves.toHaveLength(
      1
    );
    await expect(searchFromApi(site, '进击的巨人第一季')).resolves.toHaveLength(
      1
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('requests the source again after an empty result', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ list: [], pagecount: 1 }),
    });
    global.fetch = fetchMock;

    await expect(searchFromApi(site, '不存在的影片')).resolves.toEqual([]);
    await expect(searchFromApi(site, '不存在的影片')).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('requests the source again after a 403 response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });
    global.fetch = fetchMock;

    await expect(searchFromApi(site, '受限影片')).resolves.toEqual([]);
    await expect(searchFromApi(site, '受限影片')).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the eight-second timeout and retries on the next search', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        })
    );
    global.fetch = fetchMock as typeof fetch;

    const firstSearch = searchFromApi(site, '超时影片');
    jest.advanceTimersByTime(7_999);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(firstSearch).resolves.toEqual([]);

    const secondSearch = searchFromApi(site, '超时影片');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(8_000);
    await expect(secondSearch).resolves.toEqual([]);
  });
});
