// 此文件由 scripts/convert-changelog.js 自动生成
// 请勿手动编辑

export interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.4.5',
    date: '2026-08-30',
    added: [
      // 无新增内容
    ],
    changed: [
      // 无变更内容
    ],
    fixed: [
      '新增用户立即登录时，配置缓存缺失会回源刷新，避免跨实例误判为用户不存在并自动退出',
      '首页播放优先使用有效且一致的豆瓣 ID 确认同一影片；ID 缺失或不一致时保留原有标题、年份和类型匹配',
    ],
  },
  {
    version: '1.4.4',
    date: '2026-08-22',
    added: [
      // 无新增内容
    ],
    changed: ['安全搜索改为规范化标题精确匹配，不再单独放行版本后缀或续集'],
    fixed: [
      // 无修复内容
    ],
  },
  {
    version: '1.4.3',
    date: '2026-08-22',
    added: [
      // 无新增内容
    ],
    changed: ['安全搜索曾改为影视库合规标题前缀匹配'],
    fixed: [
      // 无修复内容
    ],
  },
  {
    version: '1.4.2',
    date: '2026-08-22',
    added: [
      // 无新增内容
    ],
    changed: [
      // 无变更内容
    ],
    fixed: [
      '安全搜索的豆瓣验证优先使用可部署的 CDN，并在失败时回退豆瓣直连',
      '安全搜索允许“加更版”结果与对应的豆瓣规范标题匹配',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-08-21',
    added: [
      // 无新增内容
    ],
    changed: [
      'CraterTV 改用独立语义化版本号，版本面板只展示 CraterTV 发布记录并标注上游基线',
      '修正 README 的许可标识，补充上游归属、修改说明和 NOTICE',
    ],
    fixed: [
      // 无修复内容
    ],
  },
  {
    version: '1.4.0',
    date: '2026-08-21',
    added: [
      '播放停滞、HLS 致命错误和播放器错误上报到 Vercel Runtime Logs',
      '播放器设置增加播放诊断日志导出',
    ],
    changed: [
      'ArtPlayer 升级到 5.4.0，HLS.js 升级到 1.7.1',
      '普通点播关闭 lowLatencyMode，并设置 SourceBuffer 写入超时',
    ],
    fixed: ['播放诊断地址移除查询参数、锚点和账号信息'],
  },
  {
    version: '1.3.0',
    date: '2026-08-16',
    added: [
      // 无新增内容
    ],
    changed: [
      '配置读取失败时停止写回默认配置',
      '采集源搜索和有效性检测改为分批隔离执行',
      '播放页短期复用已校验的搜索结果，减少重复请求',
      '移除会改写 HLS 时间线的实验性去广告逻辑',
      '同步 LunaTV v100.1.3 上游改动',
    ],
    fixed: [
      '修正用户组安全搜索策略和缓存刷新',
      '番剧接口失败不再清空其他首页推荐区域',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-01',
    added: [
      '豆瓣无结果时增加 TMDB 成人内容过滤和精确标题回退',
      '增加主题切换设置',
    ],
    changed: [
      // 无变更内容
    ],
    fixed: ['修正用户组安全搜索的权限边界'],
  },
  {
    version: '1.1.0',
    date: '2026-05-05',
    added: ['用户组安全预搜索和采集源权限上限', '动漫页保留番剧和剧场版分类'],
    changed: [
      '站长不受用户组和个人采集源限制',
      '普通用户的个人采集源与用户组采集源取交集',
      '搜索使用影视库规范片名匹配采集源结果',
    ],
    fixed: [
      '已封禁或不存在的用户不能继续取得采集源权限',
      '管理员不能操作站长和其他管理员',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-09',
    added: [
      '增加 Vercel 和普通 Node.js 部署支持',
      '增加 Redis、Upstash KV 和远程配置订阅支持',
      '建立 CraterTV 项目名称、图标和部署文档',
    ],
    changed: [
      // 无变更内容
    ],
    fixed: [
      // 无修复内容
    ],
  },
];

export default changelog;
