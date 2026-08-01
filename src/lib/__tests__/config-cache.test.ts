jest.mock('@/lib/db', () => ({
  db: {
    getAdminConfig: jest.fn(),
    saveAdminConfig: jest.fn(),
  },
}));

import type { AdminConfig } from '@/lib/admin.types';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

const mockedDb = db as jest.Mocked<typeof db>;

function createConfig(siteName: string): AdminConfig {
  return {
    ConfigFile: '{}',
    ConfigSubscribtion: {
      URL: '',
      AutoUpdate: false,
      LastCheck: '',
    },
    SiteConfig: {
      SiteName: siteName,
      Announcement: '',
      SearchDownstreamMaxPage: 5,
      SiteInterfaceCacheTime: 7200,
      DoubanProxyType: 'direct',
      DoubanProxy: '',
      DoubanImageProxyType: 'direct',
      DoubanImageProxy: '',
      FluidSearch: true,
      EnableWebLive: false,
    },
    UserConfig: { Users: [], Tags: [] },
    SourceConfig: [],
    CustomCategories: [],
    LiveConfig: [],
  };
}

describe('getConfig cache refresh', () => {
  beforeEach(() => {
    mockedDb.getAdminConfig.mockReset();
    mockedDb.saveAdminConfig.mockReset();
  });

  it('reloads persisted configuration when forceRefresh is requested', async () => {
    mockedDb.getAdminConfig
      .mockResolvedValueOnce(createConfig('old'))
      .mockResolvedValueOnce(createConfig('new'));

    await expect(getConfig({ forceRefresh: true })).resolves.toMatchObject({
      SiteConfig: { SiteName: 'old' },
    });
    await expect(getConfig({ forceRefresh: true })).resolves.toMatchObject({
      SiteConfig: { SiteName: 'new' },
    });

    expect(mockedDb.getAdminConfig).toHaveBeenCalledTimes(2);
  });
});
