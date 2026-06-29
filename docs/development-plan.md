# PromptBay 开发计划

本文档用于持续记录 PromptBay 的开发进度、已完成任务、待完成任务和后续规划。后续每完成一个阶段，应同步更新本文档。

## 项目目标

PromptBay 是一个 AI 生图 Prompt 市集。用户可以浏览、搜索、复制 Prompt，也可以消耗积分生成同款图片。开发者可批量上传内容，用户可投稿，投稿通过审核后可被浏览和使用，并获得积分奖励或分成。

## 当前状态

- 当前阶段：阶段 9 已完成。
- 当前形态：Next.js 前端 + API 原型，已具备数据库模型、Prompt 内容系统、投稿审核、积分扣除、模拟生成、后台管理、Demo 登录和 mock 充值闭环。
- 当前数据：`data/cases.json` 和 `data/images` 作为种子数据和 fallback 数据源；正式内容以数据库为准。
- 当前重点：从原型走向生产化，需要补齐生产支付、对象存储、分页瀑布流、部署配置和权限收口。

## 已完成阶段

### 阶段 1：需求与前端风格确认

- 明确产品定位：AI 生图 Prompt 市集。
- 明确核心角色：开发者、普通用户、管理员。
- 明确核心流程：浏览 Prompt、复制 Prompt、生成同款、用户投稿、审核上架、积分奖励和分成。
- 确认 UI 风格：浅色专业图库风，首页图片优先，后台高信息密度。

### 阶段 2：静态原型与页面骨架

- 搭建 Next.js + React + TypeScript + Tailwind CSS 项目。
- 完成首页、Prompt 详情页、投稿页、用户中心、后台管理页原型。
- 使用 mock 数据验证主要页面布局和交互路径。

### 阶段 3：首页信息架构与浏览体验

- 首页由单一瀑布流调整为“热门精选 + 最新上架”模块。
- 增加“浏览更多”入口跳转到 `/explore`。
- `/explore` 页面保留完整瀑布流浏览体验。
- 优化桌面和移动端卡片布局。

### 阶段 4：技术架构与数据模型

- 确认正式技术栈：
  - Next.js
  - React
  - TypeScript
  - Tailwind CSS
  - Prisma
  - PostgreSQL
  - NextAuth
- 确认主要数据模型：
  - User
  - Prompt
  - PromptImage
  - Asset
  - PromptSubmission
  - ImageGeneration
  - CreditTransaction
  - SystemSetting
- 确认无对象存储阶段先使用本地存储 adapter，后续替换为 S3/OSS/COS/MINIO。

### 阶段 5：基础工程能力

- 引入 Prisma schema。
- 增加 Prisma client 单例。
- 增加 NextAuth 基础配置。
- 增加本地文件存储 adapter。
- 增加本地媒体读取 API。
- 增加 `.env.example`、`docker-compose.yml` 和数据库脚本。

### 阶段 6：Prompt 内容系统

- 接入 `data/cases.json` 和 `data/images`。
- 增加本地图片路由 `/images/[...path]`。
- 增加 Prompt 列表、详情、复制 API。
- 增加投稿 API。
- 增加后台审核 API。
- 增加开发者批量导入 API。
- 增加 seed 脚本，将本地 cases 数据导入数据库。
- 将前端从纯 mock 逐步接到 API，并保留 fallback。

### 阶段 7：积分与生成同款闭环

- 增加图片生成 provider 抽象。
- 无 OpenAI key 时返回 mock 生成结果。
- 增加生成同款 API。
- 生成时扣除用户积分。
- 写入生成记录。
- 生成成功后更新 Prompt 使用次数。
- 支持作者分成积分。
- 支持失败退款。
- 详情页“生成同款”按钮接入真实 API。

### 阶段 8：用户中心与后台真实接口

- 用户中心接入账户活动 API。
- 后台接入 dashboard API。
- 后台支持投稿审核操作。
- 后台支持用户积分调整。
- 后台支持系统配置保存。
- 后台支持生成记录查看。
- 清理后台页面文案和基础交互。

### 阶段 9：登录权限、数据库初始化与充值骨架

- 增加 `/login` 页面。
- 增加 Demo 用户和 Demo 管理员登录。
- NextAuth session 增加 `role/status`。
- 增加 `requireUser` 和 `requireAdmin` 权限 helper。
- 后台 API 增加管理员权限校验。
- 生成、投稿、账户、充值接口增加用户权限校验。
- 增加 mock 充值包 API。
- 增加 mock 充值入账 API。
- 用户中心增加充值入口。
- 增加 `pnpm db:setup` 初始化脚本。
- 增加阶段 9 初始化说明文档。

## 最近变更

### Prompt 卡片改为当前页预览弹层

- 新增 `components/prompt-preview-dialog.tsx`。
- 首页 Prompt 卡片点击后不再直接跳转详情页，而是在当前页面打开预览弹层。
- `/explore` 瀑布流卡片点击后不再直接跳转详情页，而是在当前页面打开预览弹层。
- 预览弹层复用详情页核心内容：
  - 完整图片预览
  - 标题、作者、标签、模型、比例、积分消耗
  - 正向 Prompt
  - 负向 Prompt
  - 复制 Prompt
  - 生成同款
- 弹层内新增“编辑 / 工作台”按钮，暂时跳转到原详情页 `/prompts/[id]`，后续可演进为生图工作台。
- 弹层支持点击关闭按钮和按 `Escape` 关闭。

### 首页加载策略改为骨架屏

- 首页 Prompt 列表不再用 `lib/mock-data.ts` 作为首屏初始渲染数据。
- 首页先展示固定数量的 skeleton 卡片。
- `/api/prompts` 返回后再渲染“热门精选”和“最新上架”。
- API 失败时才 fallback 到本地 mock 数据。
- 目的：避免刷新首页时先显示一批 fallback 图片，然后又切换成 API 图片造成视觉闪烁。

### 引入真实 Prompt 案例 500-508

- 将 `lib/mock-data.ts` 中的旧 mock Prompt 替换为 `data/cases.json` 中 `id=500-508` 的真实提示词。
- 对应效果图使用：
  - `/images/case500.jpg`
  - `/images/case501.jpg`
  - `/images/case502.jpg`
  - `/images/case503.jpg`
  - `/images/case504.jpg`
  - `/images/case505.jpg`
  - `/images/case506.jpg`
  - `/images/case507.jpg`
  - `/images/case508.jpg`
- `lib/data-prompts.ts` 优先返回 508 到 500 这组案例。
- 已运行 `prisma generate` 和 Next build 验证。

## 待完成任务

### 复杂尺寸图片展示策略落地

- 新增 `lib/image-display.ts`，统一判断图片展示模式：
  - `cover`
  - `contain`
  - `long`
  - `grid`
  - `poster`
- 首页卡片采用“橱窗展示”策略：
  - 普通图使用 `object-cover`。
  - 长图、合集、复杂图使用 `object-contain`。
  - 复杂图增加“长图 / 合集 / 海报 / 完整预览”角标。
  - 底部增加渐隐，避免强裁切导致内容糊掉。
- `/explore` 瀑布流采用“真实比例 + 最大高度限制”策略：
  - 按图片类型推断比例。
  - 限制极端高度，避免单张长图撑爆页面。
  - 复杂图优先完整预览。
- Prompt 详情页采用完整查看策略：
  - 主图使用 `object-contain`。
  - 主图区域支持内部滚动。
  - 生成结果也完整展示，避免二次裁切。
- 已重写并清理：
  - `app/page.tsx`
  - `app/explore/explore-content.tsx`
  - `app/prompts/[id]/page.tsx`
  - `components/prompt-card.tsx`

验证：`.\node_modules\.bin\next.CMD build` 通过。

### P0：上线前必须完成

- 实现 `/api/prompts` cursor 分页。
- `/explore` 支持滚动加载下一页。
- 图片列表使用缩略图，不直接使用原图。
- 接入对象存储和 CDN。
- 增加生产级支付订单模型。
- 接入真实支付创建订单和支付回调。
- 完成数据库迁移策略，区分开发环境 `db push` 和生产环境 migration。
- 收口 `AUTH_REQUIRED=true` 下的所有访问路径。
- 增加基础错误页、空状态和权限不足页。

### P1：核心体验增强

- 后台支持单条新增 Prompt。
- 后台支持编辑 Prompt。
- 后台支持上下架 Prompt。
- 后台支持批量 JSON/CSV 导入。
- 投稿页支持真实图片上传。
- Prompt 详情页支持多张示例图。
- 用户中心接入真实投稿记录。
- 增加收藏功能。
- 增加 Prompt 点赞或收藏统计。
- 增加搜索高亮和热门标签筛选。

### P2：运营与增长

- 首页增加分类专题。
- 增加推荐规则：热门、最新、编辑精选。
- 增加作者主页。
- 增加 Prompt 使用榜单。
- 增加充值活动配置。
- 增加后台运营数据看板。

## 后续阶段规划

### 阶段 10：生产级瀑布流和图片资源优化

目标：让多用户同时浏览时，浏览器和服务器都能稳定承受。

计划：

- `/api/prompts` 增加 cursor 参数。
- 返回 `nextCursor`。
- `/explore` 实现滚动到底加载下一页。
- 每页默认返回 20-30 条。
- 首页和瀑布流只加载缩略图。
- 增加图片尺寸字段：width、height、thumbnailUrl、previewUrl、originalUrl。
- 图片资源迁移到对象存储和 CDN。
- 增加列表接口缓存策略。

### 阶段 11：对象存储与上传流程

目标：替换本地文件存储，支持正式环境图片上传和访问。

计划：

- 抽象 StorageAdapter：
  - Local
  - S3
  - OSS
  - COS
  - MINIO
- 投稿页支持图片上传。
- 后台支持上传 Prompt 示例图。
- 上传后生成 Asset 记录。
- 增加缩略图生成流程。
- 增加文件大小、类型、尺寸校验。

### 阶段 12：真实支付充值闭环

目标：从 mock 充值切换到真实支付。

计划：

- 增加 PaymentOrder 数据模型。
- 增加支付渠道配置。
- 增加创建支付订单 API。
- 增加支付回调 API。
- 回调验签。
- 支付成功后写入 CreditTransaction。
- 用户中心展示充值订单记录。
- 后台展示充值流水和异常订单。

### 阶段 13：后台内容管理完善

目标：让后台真正可运营。

计划：

- Prompt 新增、编辑、上下架。
- 批量导入预览与错误报告。
- 投稿审核详情抽屉。
- 用户积分调整审计。
- 系统配置分组管理。
- 生成记录详情查看。
- 后台搜索、筛选、分页。

### 阶段 14：权限和安全收口

目标：上线前安全加固。

计划：

- 关闭 demo 登录。
- 强制 `AUTH_REQUIRED=true`。
- 区分 USER、DEVELOPER、ADMIN 权限。
- 增加 API rate limit。
- 增加上传安全校验。
- 增加支付回调幂等。
- 增加后台操作审计日志。

### 阶段 15：部署与运维

目标：可部署、可监控、可恢复。

计划：

- 增加生产环境配置说明。
- 增加 Dockerfile。
- 增加部署文档。
- 配置数据库备份。
- 配置日志和错误监控。
- 配置健康检查。
- 配置静态资源缓存策略。

## 技术决策记录

### Prompt 内容维护方式

正式运行时以数据库为准。`data/cases.json` 和 `data/images` 作为：

- 初始化种子数据。
- 批量导入来源。
- 开发测试数据。
- 内容迁移和备份材料。

不建议把 JSON 当正式内容库，因为审核、统计、积分分成、搜索、上下架和后台管理都需要数据库支持。

### 瀑布流加载方式

正式版本不应一次性加载全部 Prompt。应使用 cursor 分页：

```text
GET /api/prompts?cursor=xxx&limit=30&category=摄影写实
```

前端滚动到底后加载下一页。图片资源应由 CDN/对象存储承载，应用服务器只负责 JSON 接口和业务逻辑。

### 对象存储策略

当前使用本地存储 adapter 是为了原型阶段快速开发。正式环境应切换为对象存储：

```text
浏览器 -> CDN -> 对象存储
应用服务器 -> 数据库
```

## 验证记录

- 最近一次构建：`.\node_modules\.bin\next.CMD build` 通过。
- 最近一次 Prisma Client 生成：`.\node_modules\.bin\prisma.CMD generate` 通过。

## 维护规则

- 每完成一个阶段，应更新“已完成阶段”和“当前状态”。
- 每新增一个大功能，应更新“最近变更”。
- 每发现生产化风险，应加入“待完成任务”。
- 每确定一项架构方向，应加入“技术决策记录”。
