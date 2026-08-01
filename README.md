# CraterTV

<div align="center">
  <img src="public/logo.png" alt="CraterTV Logo" width="120">
</div>

CraterTV 是一个基于 Next.js 的影视聚合与播放管理工具。项目不内置任何播放源或直播源，部署后需要站长自行配置采集源、用户和站点信息。

本分支重点收紧了用户权限模型，用户组支持配置安全预搜索，并简化了动漫分类：动漫页保留  `番剧`  和  `剧场版`，默认进入  `番剧`，不再提供 Bangumi 每日放送分类。

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

## 功能

- 多采集源聚合搜索，搜索结果按当前用户可用源过滤。
- 在线播放、详情页、收藏、播放记录和搜索历史。
- 后台管理站点配置、采集源、直播源、自定义分类、用户和用户组。
- 三层权限：站长、管理员、用户。
- 用户组作为采集源权限上限，用户个人采集源只能在用户组允许范围内选择。
- 用户组可启用影视库安全搜索：手动搜索优先使用豆瓣影视库，豆瓣无结果时由 TMDB 过滤成人内容。
- 豆瓣电影、电视剧、综艺、动漫推荐；动漫仅保留番剧和剧场版。
- PWA 支持，移动端和桌面端自适应。

## 权限模型

### 站长

站长由环境变量 `USERNAME` 和 `PASSWORD` 指定，拥有最高权限：

- 可管理站点配置、配置文件、订阅、数据导入导出、重置、用户、管理员、采集源、直播源和分类。
- 不受用户组和个人采集源权限限制。
- 站长账号不会保存用户组或个人采集源限制。

### 管理员

管理员由站长在后台授予：

- 可进入后台管理。
- 可管理普通用户、普通用户的采集源权限和用户组。
- 可管理站点配置、采集源、分类和直播源。
- 不能提升或取消管理员，不能操作其他管理员，不能修改站长。

### 用户

普通用户仅用于观看和个人数据同步：

- 不能访问后台管理接口。
- 搜索、详情、资源列表只在自己的可用采集源内生效。
- 如果用户属于用户组，用户组的采集源是上限。
- 如果同时配置了用户组和个人采集源，最终可用源为二者交集。
- 被封禁用户不能继续通过旧登录态获得采集源权限。

## 部署

推荐使用 Vercel 部署，也可以使用普通 Node.js 环境运行。

### Vercel

1. Fork 本仓库，或将本仓库推送到自己的 GitHub 账号。
2. 登录 [Vercel](https://vercel.com/)，选择 **Add New → Project** 并导入仓库。
3. Framework Preset 保持 **Next.js**，其余构建设置使用默认值。
4. 至少配置 `USERNAME`、`PASSWORD` 和存储服务相关环境变量；需要 TMDB 兜底时再配置 `TMDB_API_READ_TOKEN`。
5. 点击 **Deploy**。部署完成后，用 `USERNAME` 和 `PASSWORD` 登录站长后台。
6. 在后台导入或填写采集源，并按需建立用户组、启用影视库安全搜索。

推荐在 Vercel 上使用 Upstash Redis 存储，以保留后台配置、用户、收藏和播放记录。

推荐的 Vercel 环境变量组合：

```env
USERNAME=你的站长用户名
PASSWORD=高强度随机密码
NEXT_PUBLIC_STORAGE_TYPE=upstash
UPSTASH_URL=你的 Upstash REST URL
UPSTASH_TOKEN=你的 Upstash REST Token
TMDB_API_READ_TOKEN=你的 TMDB API Read Access Token
NEXT_PUBLIC_SITE_NAME=CraterTV
```

所有变量建议同时应用到 Production、Preview 和 Development。修改服务端环境变量后需要重新部署才会生效。不要为密码、Redis Token 或 TMDB Token 添加 `NEXT_PUBLIC_` 前缀。

### Node.js

本地或自有服务器需要 Node.js 与 pnpm：

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm start
```

开发模式：

```bash
corepack pnpm run dev
```

## 环境变量

| 变量                                  | 必填           | 说明                                                                  |
| ------------------------------------- | -------------- | --------------------------------------------------------------------- |
| `USERNAME`                            | 是             | 站长用户名                                                            |
| `PASSWORD`                            | 是             | 站长密码，也是登录签名密钥                                            |
| `NEXT_PUBLIC_STORAGE_TYPE`            | 建议           | 存储方式：`localstorage`、`upstash`、`redis`、`kvrocks`               |
| `UPSTASH_URL`                         | Upstash 时必填 | Upstash Redis REST URL，也兼容 Vercel KV 注入的 `KV_REST_API_URL`     |
| `UPSTASH_TOKEN`                       | Upstash 时必填 | Upstash Redis REST Token，也兼容 Vercel KV 注入的 `KV_REST_API_TOKEN` |
| `REDIS_URL`                           | Redis 时必填   | Redis 连接地址                                                        |
| `KVROCKS_URL`                         | Kvrocks 时必填 | Kvrocks 连接地址                                                      |
| `NEXT_PUBLIC_SITE_NAME`               | 否             | 站点名称，默认 `CraterTV`                                             |
| `ANNOUNCEMENT`                        | 否             | 站点公告                                                              |
| `SITE_BASE`                           | 否             | 站点外部访问地址，用于部分播放地址重写                                |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE`         | 否             | 搜索接口最大拉取页数，默认 `5`                                        |
| `TMDB_API_READ_TOKEN`                 | 安全搜索建议   | TMDB API 读访问令牌，豆瓣无结果时用于规范片名和过滤成人内容           |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE`       | 否             | 豆瓣数据代理类型，默认 `cmliussss-cdn-tencent`                        |
| `NEXT_PUBLIC_DOUBAN_PROXY`            | 否             | 自定义豆瓣数据代理 URL                                                |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` | 否             | 豆瓣图片代理类型，默认 `cmliussss-cdn-tencent`                        |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY`      | 否             | 自定义豆瓣图片代理 URL                                                |
| `NEXT_PUBLIC_FLUID_SEARCH`            | 否             | 是否启用流式搜索，默认启用；设为 `false` 可关闭                       |

`localstorage` 适合临时体验，不适合正式使用。该模式下用户数据和部分配置只保存在浏览器本地，无法多端同步，后台配置也不能可靠持久化。

TMDB 令牌应写入部署平台的服务端环境变量或本地 `.env.local`，不要使用
`NEXT_PUBLIC_` 前缀，也不要提交到版本库。为用户组启用影视库安全搜索后，系统先从
豆瓣影视库获取规范名称；豆瓣没有影视结果时，再由 TMDB 排除成人内容并提供规范
名称，最后到该组允许的播放源中做精确匹配。两个影视库都不可用或都没有结果时
返回空结果。

首页豆瓣推荐会标记为豆瓣目录来源：播放时直接使用卡片标题匹配播放源，不再查询
豆瓣或 TMDB。该简化方式适用于私有站点；公开部署时应改为不可伪造的来源凭证。

## 安全搜索策略

安全搜索按用户组启用，不影响站长账号：

```text
首页豆瓣推荐 → 直接使用卡片标题 → 精确匹配播放源

用户手动搜索 → 豆瓣影视库有结果 → 使用豆瓣规范标题 → 精确匹配播放源
             └→ 豆瓣无结果 → TMDB 排除成人内容 → 精确匹配播放源
```

- “影视库搜索”是模糊搜索，用于找到规范片名。
- 播放源结果只保留规范化后标题完全一致的条目。
- 标题规范化会忽略大小写、空格和常见中英文标点。
- 豆瓣和 TMDB 都没有结果时，受保护用户组返回空结果，不退化为普通全源搜索。

## 采集源配置

项目默认不提供任何影视采集源。站长需要在后台配置文件中导入采集源，或在后台手动添加。

配置示例：

```json
{
  "cache_time": 7200,
  "api_site": {
    "demo": {
      "api": "https://example.com/api.php/provide/vod",
      "name": "示例资源",
      "detail": "https://example.com"
    }
  },
  "custom_category": [
    {
      "name": "华语",
      "type": "movie",
      "query": "华语"
    }
  ],
  "live": {
    "demo-live": {
      "name": "示例直播",
      "url": "https://example.com/live.m3u"
    }
  }
}
```

说明：

- `cache_time`：接口缓存时间，单位秒。
- `api_site`：影视采集源，要求兼容常见 CMS V10 JSON API。
- `api_site.*.api`：采集源 API 地址。
- `api_site.*.name`：前端展示名称。
- `api_site.*.detail`：可选，部分源需要网页详情地址辅助解析。
- `custom_category`：自定义豆瓣分类。
- `live`：直播源配置。

配置订阅支持将完整配置文件进行 base58 编码后，通过 HTTP URL 提供给后台拉取。

## 使用建议

1. 部署后先设置强密码。
2. 不要公开分享自己的实例地址。
3. 不要将第三方采集源配置提交到公开仓库。
4. 使用用户组作为权限上限，再给用户分配个人采集源。
5. 修改用户组采集源后，用户个人采集源会被裁剪到用户组允许范围内。

## 安全与声明

- 本项目仅作为学习和个人使用工具。
- 本项目不提供、不存储、不分发任何影视资源。
- 所有采集源、直播源和播放内容均由部署者自行配置并承担责任。
- 请遵守所在地法律法规，不要将实例用于公开服务、商业用途或侵权用途。
- 请不要在公开社交平台传播项目实例、采集源或订阅链接。

## Android TV

项目保留 OrionTV 兼容接口，可作为 Android TV 客户端的后端使用。可用资源同样受当前登录用户的采集源权限限制。

## 致谢

感谢前序项目和开源作者的工作，本项目是在这些基础上继续调整和维护：

- [MoonTV](https://github.com/MoonTechLab/LunaTV) 与原项目贡献者。
- [LibreTV](https://github.com/LibreSpark/LibreTV) 的启发。
- [ts-nextjs-tailwind-starter](https://github.com/theodorusclarence/ts-nextjs-tailwind-starter) 提供的初始工程思路。
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) 提供网页播放器能力。
- [HLS.js](https://github.com/video-dev/hls.js/) 提供 HLS 播放支持。
- [Zwei](https://github.com/bestzwei) 提供豆瓣 cors proxy。
- [CMLiussss](https://github.com/cmliu) 提供豆瓣 CDN 服务。
- 感谢所有为相关生态提供工具、文档和问题反馈的开发者。

## License

[MIT](LICENSE)
