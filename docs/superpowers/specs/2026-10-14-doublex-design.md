# DoubleX 个人网站设计

- 日期：2026-10-14
- 状态：设计已确认（首页包含「精选项目」区块），待实现
- 站点地址：https://jianchuxin.github.io/DoubleX/
- 仓库：https://github.com/jianchuxin/DoubleX

## 1. 目标与非目标

DoubleX 是一个前端开发者的个人网站：作品集为主，博客为辅，部署在 GitHub Pages 项目页
（子路径 `/DoubleX/`）。

目标：

- 作品集：项目卡片网格与详情页，含技术标签、仓库/演示外链
- 博客：长文 + 归档 / 分类 / 标签 / 系列 + 全文搜索 + RSS
- 个人空间：首页仪表盘（个人卡、介绍、精选项目、博客热力图、快捷入口、联系卡、Doing）
- 工程示范：完整 CI/CD（PR 校验 + main 自动部署），借项目学习 Astro 内容集合与 GitHub Actions

非目标（v1 不做）：

- 不启用 vibe（碎碎念）、media（书影音）、评论、友链同步（保留配置开关，未来可开）
- 不做自定义域名（未来接入时只改配置）
- 不做多语言（站内语言 zh-CN；主题的 en / zh-TW 语言包保留但不启用）
- 不引入分析统计脚本

## 2. 底座与技术栈

底座为开源主题 navfolio v1（MIT 协议）：

- 仓库：`dodolalorc/astro-navfolio`，commit `70aa71ddd9`（2026-07-27），版本 0.2.0
- 选型理由：中文优先的文档、圆润的「个人空间」气质、MIT、组件全部在仓库内可改、自带 GitHub Pages 工作流雏形
- 技术：Astro 7.1.3 + Tailwind CSS 4 + TypeScript + MDX
- 能力：Pagefind 全文搜索（Cmd+K）、目录（TOC）、系列/分类/标签/归档、博客热力图、
  浅深色切换、8 套配色、Expressive Code、KaTeX、Mermaid、图片灯箱
- 生态包：`@navfolio/core`、`@navfolio/pages`、`@navfolio/theme-default`、
  `@navfolio/plugin-markdown`、`@navfolio/mdx-components`（GitHub 依赖，`bun.lock` 锁定 commit）
- 字体：英文/代码 Maple Mono（@fontsource），中文 ChillRoundM（仓库内置 TTF，构建时按实际用字生成 WOFF2 子集）

工具链：

- Node >= 22.12（`.nvmrc` 指定 22.12.0；本地实际使用 22.22.3）
- Bun 1.4.3（安装、脚本与构建运行时）
- Python 3 + fontTools + brotli（项目内 `.venv`，构建期字体子集化）
- 构建链：`bun run build` = 字体子集化 -> `astro build` -> `pagefind` 索引

已实测结论（本机与模拟 CI 环境）：

- `bun install --frozen-lockfile`：625 个包，约 48 秒
- 完整构建数秒内完成；字体子集 6.5MB TTF -> 82KB WOFF2
- 模拟 `GITHUB_REPOSITORY=jianchuxin/DoubleX` 构建后，全站链接扫描 0 泄漏

仓库整合方式：

- 把 navfolio v1 全树并入本仓库，替换现有 Astro 6 脚手架（保留 git 历史）
- 移除主题自带的 docs 子模块相关文件（`.gitmodules`、`src/docs`）与面向其官方 demo 的 `vercel.json`
- 保留主题 LICENSE（MIT 署名）；README 改写为 DoubleX 自己的说明

## 3. 信息架构

| 路由 | 内容 |
| --- | --- |
| `/` | 首页仪表盘 |
| `/projects/` | 项目索引（卡片网格） |
| `/projects/<id>/` | 项目详情 |
| `/blog/` | 博客列表（分页） |
| `/blog/<id>/` | 文章页（封面、TOC、系列、标签） |
| `/blog/archives/`、`/blog/categories/`、`/blog/tags/`、`/blog/series/` | 归档类页面 |
| `/about/` | 关于 |
| `/rss.xml`、`/sitemap-index.xml`、`/404.html` | 订阅与辅助页面 |

顶部导航：首页 / 博客 / 项目 / 关于（Vibe、Media 不启用）。
搜索快捷键：Cmd/Ctrl+K。

## 4. 首页结构

主列（左，内容优先）：

1. 介绍卡：一句引语 + 自我介绍（中文占位文案，待站主替换）
2. 精选项目卡（新增）：取自 projects 集合，`sticky` 优先、其次按日期倒序，默认展示 2 个
   （数量可配置）；卡片沿用项目索引的样式语言（图标、标题、描述、标签、外链）
3. Doing：最近在做的事（列表，占位）

侧列（右，个人信号）：

1. 个人卡：头像、名字、handle、角色
2. 博客热力图：最近 24 周写作活跃度 + 最新文章入口
3. 快捷入口：项目 / 博客 / 关于 / GitHub
4. 联系卡：邮箱、GitHub（支持复制）

## 5. 内容模型

内容位于 `src/content/`，schema 定义在 `src/content.config.ts`（Zod 校验）：

- `about.mdx`：标题、描述、日期、正文（关于页）
- `blog/*.md|mdx`：title、description、date、draft、heroImage、tags、categories、series、sticky、sidebar
- `projects/*.md|mdx`：在博客字段基础上增加 icon（内置图标名）、iconColor、authors、links（github/web）；
  `projects/index.mdx` 为索引页说明（必需）

站点配置位于 `src/config/site.toml`：

- `[config.site]`：站名 DoubleX、描述、URL、页脚
- `[config.theme]`：配色（默认 green-soft）、语言 zh-CN
- `[config.home]`：引语、介绍、热力图、快捷入口、联系卡、Doing、精选项目数量（新增）
- `[config.profile]`：名字、handle、角色、邮箱、GitHub、头像
- `[config.pages.*]`：各页面标题与文案

## 6. 视觉与品牌

- 沿用 navfolio 设计语言：圆体中文字 + 等宽英文、浅深色切换、悬浮胶囊导航、卡片式仪表盘
- 8 套配色可选，默认 green-soft
- 品牌替换为 DoubleX：站点标题、描述、favicon 组、OG 图、页脚署名
- 代码高亮、数学公式、图片灯箱等能力保持主题默认

## 7. 子路径适配（/DoubleX/）

GitHub Pages 项目页从子路径提供服务。主题自带的 base 处理存在 6 类路径遗漏
（对应 5 处代码修改与 1 个依赖补丁），已实测修复方案（实现时原样落地）：

1. `astro.config.mjs`：`site` 与 `base` 输出补尾斜杠（修复 favicon 组与 head 中 RSS 订阅链接）
2. `src/pages/rss.xml.js`：RSS 条目链接加 base 前缀
3. `src/utils/blog-heatmap.ts`：热力图「最新文章」与日期格子链接加 base 前缀
4. `src/components/cards/ProfileCard.astro`：头像路径按 base 解析
5. `patches/@navfolio%2Ftheme-default@github%3Anavfolio%2Ftheme-default#0be2d98.patch`：
   修复依赖包内硬编码的 sitemap 链接（bun patch，锁定 commit，`bun install` 时自动应用）

验证方式：构建产物扫描 `dist` 内全部 `href` / `src` / 绝对 URL，断言均带 `/DoubleX/` 前缀（0 泄漏）。

## 8. CI/CD

- `.github/workflows/deploy.yml`：推送到 main（含手动触发）-> Node 22 -> Bun -> 安装 fontTools/brotli
  -> `bun install --frozen-lockfile` -> `bun run build` -> 上传 artifact -> deploy-pages
- `.github/workflows/ci.yml`：PR 与非 main 分支 -> 安装与构建校验
- Pages 已启用（Source: GitHub Actions），部署地址 https://jianchuxin.github.io/DoubleX/
- 本地开发：`bun run dev`（默认端口 4321）；构建：`bun run build`

## 9. 内容与素材清单

本次实现写入的占位内容：

- 2 个示例项目（含封面、标签、外链）
- 2 篇示例博客
- 关于页、首页引语/介绍/Doing、联系信息
- 占位头像与 favicon（中性图形，不含主题品牌元素）

待站主提供（上线后替换）：

- 头像照片、邮箱、显示名 / handle / 角色
- GitHub 之外的社交链接
- 真实项目清单（名称、一句话、链接、技术标签）
- 首页一句话与自我介绍

## 10. 验收标准

- 本地 `bun run build` 通过，`bun run dev` 可用
- 链接扫描 0 泄漏（`/DoubleX/` 前缀完整）
- PR CI 通过；合并 main 后自动部署成功
- 线上可访问：首页、项目、博客、关于、搜索（Cmd+K）、RSS、sitemap、404
- 浅深色切换与 8 套配色可用

## 11. 实施方式

- 在 `feat/navfolio-base` 分支完成底座并入与内容占位，分步提交：
  引入底座 / 子路径修复 / 品牌与内容 / 首页精选项目 / CI 重写
- PR -> CI 校验 -> 合并 main -> 自动部署
- 实现计划另行产出：`docs/superpowers/plans/2026-10-14-doublex-implementation.md`
