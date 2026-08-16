jest.mock('@/lib/db', () => ({
  db: {
    getAdminConfig: jest.fn(),
    getAllUsers: jest.fn(),
    saveAdminConfig: jest.fn(),
  },
}));

import type { AdminConfig } from '@/lib/admin.types';
import {
  getConfig,
  isSafeSearchEnabledForUser,
  resetConfig,
} from '@/lib/config';
import { db } from '@/lib/db';

const mockedDb = db as jest.Mocked<typeof db>;
let consoleErrorSpy: jest.SpyInstance;

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
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockedDb.getAdminConfig.mockReset();
    mockedDb.getAllUsers.mockReset();
    mockedDb.saveAdminConfig.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not initialize or persist when the initial database read fails', async () => {
    const readError = new Error('temporary database failure');
    mockedDb.getAdminConfig.mockRejectedValue(readError);

    await expect(getConfig({ forceRefresh: true })).rejects.toBe(readError);

    expect(mockedDb.getAllUsers).not.toHaveBeenCalled();
    expect(mockedDb.saveAdminConfig).not.toHaveBeenCalled();
  });

  it('initializes and persists when the database confirms no config exists', async () => {
    mockedDb.getAdminConfig.mockResolvedValue(null);
    mockedDb.getAllUsers.mockResolvedValue([]);

    await expect(getConfig({ forceRefresh: true })).resolves.toBeDefined();

    expect(mockedDb.getAllUsers).toHaveBeenCalledTimes(1);
    expect(mockedDb.saveAdminConfig).toHaveBeenCalledTimes(1);
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

  it('does not write a persisted configuration back during a read', async () => {
    mockedDb.getAdminConfig.mockResolvedValue(createConfig('persisted'));

    await getConfig({ forceRefresh: true });

    expect(mockedDb.saveAdminConfig).not.toHaveBeenCalled();
  });

  it('returns the cached config without persisting when a refresh read fails', async () => {
    const persistedConfig = createConfig('cached');
    mockedDb.getAdminConfig
      .mockResolvedValueOnce(persistedConfig)
      .mockRejectedValueOnce(new Error('temporary database failure'));

    await getConfig({ forceRefresh: true });

    await expect(getConfig({ forceRefresh: true })).resolves.toBe(
      persistedConfig
    );
    expect(mockedDb.saveAdminConfig).not.toHaveBeenCalled();
  });

  it('does not keep safe search enabled after the user is removed from all groups', async () => {
    const groupedConfig = createConfig('grouped');
    groupedConfig.UserConfig.Users.push({
      username: 'viewer',
      role: 'user',
      banned: false,
      tags: ['restricted'],
    });
    groupedConfig.UserConfig.Tags = [
      {
        name: 'restricted',
        enabledApis: [],
        safeSearchEnabled: true,
      },
    ];

    const ungroupedConfig = createConfig('ungrouped');
    ungroupedConfig.UserConfig.Users.push({
      username: 'viewer',
      role: 'user',
      banned: false,
    });
    ungroupedConfig.UserConfig.Tags = groupedConfig.UserConfig.Tags;

    mockedDb.getAdminConfig
      .mockResolvedValueOnce(groupedConfig)
      .mockResolvedValueOnce(ungroupedConfig);

    await getConfig({ forceRefresh: true });

    await expect(isSafeSearchEnabledForUser('viewer')).resolves.toBe(false);
    expect(mockedDb.getAdminConfig).toHaveBeenCalledTimes(2);
  });

  it('enables safe search only for users assigned to an enabled group', async () => {
    const config = createConfig('group-policy');
    config.UserConfig.Users.push(
      {
        username: 'grouped-viewer',
        role: 'user',
        banned: false,
        tags: ['restricted'],
      },
      {
        username: 'ungrouped-viewer',
        role: 'user',
        banned: false,
      }
    );
    config.UserConfig.Tags = [
      {
        name: 'restricted',
        enabledApis: [],
        safeSearchEnabled: true,
      },
    ];
    mockedDb.getAdminConfig.mockResolvedValue(config);

    await expect(isSafeSearchEnabledForUser('grouped-viewer')).resolves.toBe(
      true
    );
    await expect(isSafeSearchEnabledForUser('ungrouped-viewer')).resolves.toBe(
      false
    );
  });

  it('does not rebuild or persist during reset when the database read fails', async () => {
    const readError = new Error('temporary database failure');
    mockedDb.getAdminConfig.mockRejectedValue(readError);

    await expect(resetConfig()).rejects.toBe(readError);

    expect(mockedDb.getAllUsers).not.toHaveBeenCalled();
    expect(mockedDb.saveAdminConfig).not.toHaveBeenCalled();
  });
});
