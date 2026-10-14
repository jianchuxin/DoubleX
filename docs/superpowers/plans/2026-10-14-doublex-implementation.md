# DoubleX 实施计划（navfolio v1 底座）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 navfolio v1 全树引入 DoubleX 仓库替换现有脚手架，完成品牌与占位内容、`/DoubleX/` 子路径修复、CI/CD 工作流，并自动部署到 https://jianchuxin.github.io/DoubleX/

**Architecture:** 整树替换（保留 git 历史）→ 本地工具链（Bun + Python venv + fontTools）→ 占位内容让基线构建转绿 → 修复 6 类子路径问题（含 1 个 bun 依赖补丁）→ 品牌与首页精选项目 → 重写 GitHub Actions → PR 合并触发自动部署

**Tech Stack:** Astro 7.1.3、Tailwind CSS 4、TypeScript、MDX、Bun 1.4、Pagefind、fontTools、GitHub Actions

---

## 约定

- 所有命令在仓库根目录 `/Users/jianchuxin/Desktop/Code/DoubleX` 执行
- 开始每个任务前先设置环境（本项目网络需要代理；Astro 需要 Node 22）：

```bash
export PATH="$HOME/.bun/bin:$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"
export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 all_proxy=socks5://127.0.0.1:7897
```

- Task 2 之后 husky 钩子生效：提交前会跑 `bun run format:check`（eslint + prettier）。若报格式错误，先 `bun run format`，修复剩余报错后再提交。

## 文件结构（本计划涉及）

创建：

- `src/content/about.mdx`、`src/content/blog/hello-doublex.md`、`src/content/blog/how-this-site-is-built.md`
- `src/content/projects/index.mdx`、`src/content/projects/doublex-site.md`、`src/content/projects/sample-project.md`
- `scripts/check-base-paths.mjs`（子路径检查脚本）
- `patches/@navfolio%2Ftheme-default@github%3Anavfolio%2Ftheme-default#0be2d98.patch`（依赖补丁）
- `src/components/cards/FeaturedProjectsCard.astro`（首页精选项目）
- `public/images/avatar.svg`（占位头像）
- `.github/workflows/ci.yml`

修改：

- `astro.config.mjs`、`src/pages/rss.xml.js`、`src/utils/blog-heatmap.ts`、`src/components/cards/ProfileCard.astro`（子路径修复）
- `navfolio.config.ts`（关闭 vibe / media 模块）
- `src/config/site.toml`（品牌、文案、个人资料、导航、精选项目开关）
- `src/content.config.ts`（home.featured schema）
- `src/components/layout/DashboardFlow.astro`、`src/pages/index.astro`（精选项目插槽）
- `package.json`（patchedDependencies + check:base 脚本）
- `.nvmrc`（改为 `22`）
- `.github/workflows/deploy-pages.yml`（重写）
- `README.md`（重写）
- `public/favicon.svg`（换成 DX 标记）
- `docs/superpowers/specs/2026-10-14-doublex-design.md`（两处与实现对齐的小修订）

随整树替换进入或保持不动的关键文件：`bun.lock`、`navfolio.config.ts`、`src/content.config.ts`、`src/components/**`（43 个本地组件）、`public/fonts/`（ChillRoundM、LXGW WenKai、Monaco）、`.husky/`、`LICENSE`、`.npmrc`（npmmirror 镜像源）。

---

### Task 1: 分支与整树替换

**Files:** 仓库根目录全部文件（替换）

- [ ] Step 1: 建分支

```bash
git checkout -b feat/navfolio-base
```

- [ ] Step 2: 移除旧脚手架文件（走 git，可回滚）

```bash
git rm -r --quiet .github .nvmrc .gitignore README.md astro.config.mjs package.json package-lock.json public src tsconfig.json
```

Expected: 输出一串 `rm '...'`。

- [ ] Step 3: 解压 navfolio v1 并整树复制（排除演示专用文件）

```bash
unzip -oq ~/Downloads/astro-navfolio-1.zip -d /tmp/navfolio-v1
rsync -a \
  --exclude '.gitmodules' \
  --exclude 'src/docs' \
  --exclude 'vercel.json' \
  --exclude 'CONTRIBUTING.md' \
  --exclude 'CHANGELOG.md' \
  --exclude '.github/scripts' \
  --exclude '.github/deepseek-reviewer.json' \
  --exclude '.github/workflows/deepseek-inline-review.yml' \
  /tmp/navfolio-v1/astro-navfolio-1/ /Users/jianchuxin/Desktop/Code/DoubleX/
```

- [ ] Step 4: 验证复制结果

```bash
python3 -c "import json;print(json.load(open('package.json'))['version'])"
ls astro.config.mjs navfolio.config.ts bun.lock public/fonts/ChillRoundM.ttf
git status --short | head -20
```

Expected: `0.2.0`；关键文件存在；`git status` 显示旧文件删除（`D`）与新文件（`??`）。

- [ ] Step 5: 提交

```bash
git add -A
git commit -m "chore: adopt navfolio v1 as site base"
```

- [ ] Step 6: 验证

```bash
git log --oneline -3
git ls-files | wc -l
```

Expected: 新提交 `chore: adopt navfolio v1 as site base`；跟踪文件数约 240。

---

### Task 2: 工具链安装与基线构建（预期失败）

**Files:** `.nvmrc`（修改）、`.venv/`（生成、已忽略）、`node_modules/`（重装）

- [ ] Step 1: 编辑 `.nvmrc`，内容改为单行 `22`（本机 nvm 已装 22.22.3）

```bash
printf '22\n' > .nvmrc
cat .nvmrc
```

Expected: `22`。

- [ ] Step 2: 建 Python venv 并安装字体子集工具

```bash
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip fonttools brotli
.venv/bin/python -c "import fontTools, brotli; print('fonttools', fontTools.version)"
```

Expected: `fonttools 4.60.x`。

- [ ] Step 3: 移走旧脚手架依赖（避免新旧依赖混杂）

```bash
mv node_modules /tmp/doublex-node_modules-old
```

- [ ] Step 4: 安装依赖（husky prepare 会同时安装 git hooks）

```bash
bun install --frozen-lockfile
```

Expected: `625 packages installed`（±几个），末尾出现 `husky`。

- [ ] Step 5: 基线构建（预期失败：内容为空）

```bash
bun run build
```

Expected: 失败，报 `Missing src/content/about.mdx content entry.`。这是预期结果，Task 3 会补内容。

- [ ] Step 6: 确认没有意外产物进入 git

```bash
git status --short
```

Expected: 仅 `.nvmrc` 一处修改。

- [ ] Step 7: 提交

```bash
git add .nvmrc
git commit -m "chore: pin node version line to 22"
```

（若 husky 校验失败：先 `bun run format`，处理剩余 lint 报错，再提交。）

---

### Task 3: 占位内容（让构建转绿）

**Files:**

- Create: `src/content/about.mdx`
- Create: `src/content/blog/hello-doublex.md`
- Create: `src/content/blog/how-this-site-is-built.md`
- Create: `src/content/projects/index.mdx`
- Create: `src/content/projects/doublex-site.md`
- Create: `src/content/projects/sample-project.md`

- [ ] Step 1: 创建 6 个内容文件（完整内容如下）

`src/content/about.mdx`：

```mdx
---
title: 关于 DoubleX
description: DoubleX 是简楚欣的个人网站：作品集与博客。
date: 2026-10-14
---

# 你好，我是简楚欣

这是「关于」页面的占位内容，之后会替换成正式的自我介绍。

- 前端开发，主要用 TypeScript / React / Vue
- 正在把想法一个个做成能用的作品
- 这个网站用来放作品、写笔记、记录进展

想聊聊的话，可以通过右侧的联系方式找到我。
```

`src/content/blog/hello-doublex.md`：

```md
---
title: 你好，DoubleX
description: 博客开通了，简单说说这个站点要做什么。
date: 2026-10-14
tags: ['随笔']
categories: ['随笔']
showHeroImage: false
---

# 你好，DoubleX

博客开通。这里是第一篇文章的占位内容。

DoubleX 会用来放三类东西：

1. 作品：把做过的东西整理成项目笔记
2. 博客：学习记录、技术笔记、踩坑总结
3. 进展：最近在做什么

之后所有文章都会从这里长出来。
```

`src/content/blog/how-this-site-is-built.md`：

```md
---
title: 这个网站是怎么搭起来的
description: Astro + navfolio 主题 + GitHub Actions，一次完整的静态站点实践。
date: 2026-10-14
tags: ['Astro', 'GitHub Actions', '静态站点']
categories: ['技术']
series: ['建站笔记']
showHeroImage: false
---

# 这个网站是怎么搭起来的

DoubleX 的目标是「作品集 + 博客」，部署在 GitHub Pages 上。技术选型：

- Astro：构建时渲染成静态 HTML，浏览器只加载很少的 JS
- navfolio 主题：提供设计系统（圆体中文字、配色、热力图、搜索）
- GitHub Actions：PR 自动构建校验，合并 main 自动部署

## 为什么选静态站点

个人站的核心是内容。构建时把 Markdown 渲染成 HTML，首屏快、SEO 好，也没有服务器要维护。

## 部署流水线

1. 本地写 Markdown / MDX
2. 推送分支，GitHub Actions 安装依赖并构建
3. 合并到 main，自动发布到 GitHub Pages

这篇文章是占位内容，之后会补充更多细节。
```

`src/content/projects/index.mdx`：

```mdx
---
title: 项目
description: 做过的东西与正在做的事。
date: 2026-10-14
---

# 项目

这里收录我做过的项目，每个项目是一份简报：为什么做、解决了什么问题、怎么实现的。

- 索引卡片按置顶与时间排序
- 点击进入项目详情，可以看到背景与取舍
```

`src/content/projects/doublex-site.md`：

```md
---
title: DoubleX 个人网站
description: 用 Astro 与 navfolio 主题搭建的作品集 + 博客站点，部署在 GitHub Pages。
date: 2026-10-14
icon: rocket
tags: ['Astro', 'TypeScript', 'GitHub Actions']
links:
  - label: GitHub
    href: https://github.com/jianchuxin/DoubleX
    kind: github
---

# DoubleX 个人网站

这个站点本身：构建时渲染的静态网站，内容用 Markdown / MDX 维护。

- 静态输出：Astro 在构建时生成全部 HTML
- 全文搜索：Pagefind 索引在构建时生成
- 自动部署：推送到 main 后由 GitHub Actions 发布到 GitHub Pages
```

`src/content/projects/sample-project.md`：

```md
---
title: 示例项目（待替换）
description: 这是一个占位项目，用来展示项目卡片的样子；替换成你的真实项目即可。
date: 2026-10-14
icon: sparkles
tags: ['示例']
---

# 示例项目

这是占位内容。之后把这个文件替换成真实项目，或者直接删掉。
```

- [ ] Step 2: 构建（预期成功）

```bash
bun run build
```

Expected: 成功；Pagefind 输出 `Indexed N pages`。

- [ ] Step 3: 格式检查（husky 会跑同样的检查）

```bash
bun run format:check
```

Expected: 通过；若失败执行 `bun run format` 后重跑。

- [ ] Step 4: 提交

```bash
git add src/content
git commit -m "content: add placeholder posts, projects and about page"
```

---

### Task 4: 子路径修复 + 检查脚本

**Files:**

- Create: `scripts/check-base-paths.mjs`
- Create: `patches/@navfolio%2Ftheme-default@github%3Anavfolio%2Ftheme-default#0be2d98.patch`
- Modify: `astro.config.mjs`
- Modify: `src/pages/rss.xml.js`
- Modify: `src/utils/blog-heatmap.ts`
- Modify: `src/components/cards/ProfileCard.astro`
- Modify: `package.json`

- [ ] Step 1: 创建 `scripts/check-base-paths.mjs`（完整内容）

```js
#!/usr/bin/env node
// 扫描构建产物的链接，确保站内链接都带部署子路径前缀。
// 用法: node scripts/check-base-paths.mjs [base] [site]
//   base 默认 /DoubleX；site 默认 https://jianchuxin.github.io/DoubleX
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const argBase = process.argv[2] ?? '/DoubleX';
const argSite = process.argv[3] ?? 'https://jianchuxin.github.io/DoubleX';
const base = argBase === '/' ? '/' : argBase.replace(/\/+$/, '');
const site = argSite.replace(/\/+$/, '');
const siteHost = new URL(site).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const absoluteRe = new RegExp(`https?://${siteHost}/[^"'\\s<>()]*`, 'g');
const dist = 'dist';

const problems = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

for (const file of walk(dist)) {
  if (!/\.(html|xml)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  const where = relative(process.cwd(), file);

  if (base !== '/') {
    for (const match of text.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const href = match[1];
      if (href === base || href.startsWith(`${base}/`)) continue;
      problems.push(`${where}: ${href}`);
    }
  }

  for (const match of text.matchAll(absoluteRe)) {
    const url = match[0];
    if (url === site || url.startsWith(`${site}/`)) continue;
    problems.push(`${where}: ${url}`);
  }
}

if (problems.length > 0) {
  console.error(`发现 ${problems.length} 处缺少 base 前缀的链接:`);
  for (const line of problems) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`OK: dist 内链接全部带 ${base} 前缀（site: ${site}）`);
```

- [ ] Step 2: 构建并运行检查（预期失败：列出所有泄漏）

```bash
export GITHUB_ACTIONS=true GITHUB_REPOSITORY=jianchuxin/DoubleX GITHUB_REPOSITORY_OWNER=jianchuxin
bun run build
node scripts/check-base-paths.mjs
```

Expected: 退出码 1，输出类似：

```
dist/index.html: /DoubleXfavicon.svg
dist/index.html: /sitemap-index.xml
dist/index.html: /blog/hello-doublex/
dist/index.html: /images/logo-thin.webp
dist/index.html: https://jianchuxin.github.io/rss.xml
```

- [ ] Step 3: 修复 `astro.config.mjs`（三处）

在 `normalizeSiteUrl` 之后新增帮助函数：

```js
const withTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);
```

`githubPagesSite` 改为：

```js
const githubPagesSite =
  repositoryOwner && repositoryName
    ? `https://${repositoryOwner}.github.io${isProjectPage ? `/${repositoryName}/` : '/'}`
    : undefined;
```

`resolvedSite` 与 `resolvedBase` 改为：

```js
const resolvedSite = withTrailingSlash(
  normalizeSiteUrl(customSite) ||
    (isGitHubActions && githubPagesSite ? githubPagesSite : undefined) ||
    normalizeSiteUrl(configuredSiteUrl) ||
    'https://example.com',
);

const resolvedBase = withTrailingSlash(
  customBase || (isGitHubActions && isProjectPage && repositoryName ? `/${repositoryName}` : '/'),
);
```

- [ ] Step 4: 修复 `src/pages/rss.xml.js`（两处）

在 `const posts = ...` 之后新增：

```js
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
```

条目里的链接改为：

```js
      link: `${base}/blog/${post.id}/`,
```

- [ ] Step 5: 修复 `src/utils/blog-heatmap.ts`（三处）

在 import 之后新增模块级常量：

```ts
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
```

`getLatestPosts` 与 `getPostsByDate` 里的两处 `href` 都改为：

```ts
      href: `${base}/blog/${post.id}/`,
```

- [ ] Step 6: 修复 `src/components/cards/ProfileCard.astro`（两处）

在 `const { profile } = ...` 之后新增：

```ts
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const avatarSrc = /^https?:\/\//.test(profile.avatar)
  ? profile.avatar
  : `${basePath}${profile.avatar.startsWith('/') ? profile.avatar : `/${profile.avatar}`}`;
```

`<img>` 的 `src={profile.avatar}` 改为 `src={avatarSrc}`。

- [ ] Step 7: 创建依赖补丁并注册（修复 sitemap 链接）

新建 `patches/@navfolio%2Ftheme-default@github%3Anavfolio%2Ftheme-default#0be2d98.patch`，内容：

```diff
diff --git a/src/components/BaseHead.astro b/src/components/BaseHead.astro
index 0a8cf252bb7a550afe357b3b4596025081a500dd..a8c7aa443b14b3add14f828b1c8f739361363229 100644
--- a/src/components/BaseHead.astro
+++ b/src/components/BaseHead.astro
@@ -185,7 +185,7 @@ html:root{--font-config-en:${enFamily};--font-config-code:${codeFamily};--font-c
 <link rel="apple-touch-icon" sizes="180x180" href={assetPath('apple-touch-icon.png')} />
 <link rel="manifest" href={assetPath('manifest.json')} />
 <meta name="theme-color" content="#fdfdf9" />
-<link rel="sitemap" href="/sitemap-index.xml" />
+<link rel="sitemap" href={assetPath('sitemap-index.xml')} />
 <link
   rel="alternate"
   type="application/rss+xml"
```

（若排版工具改动了缩进导致补丁应用失败，改用：`bun patch @navfolio/theme-default` → 直接编辑
`node_modules/@navfolio/theme-default/src/components/BaseHead.astro` 的 sitemap 行 →
`bun patch --commit 'node_modules/@navfolio/theme-default'`。）

在 `package.json` 顶层加入 `patchedDependencies` 字段（与 `"scripts"`、`"lint-staged"` 同级；
放在 `"lint-staged"` 之前即可保证 JSON 逗号合法）：

```json
  "patchedDependencies": {
    "@navfolio/theme-default@github:navfolio/theme-default#0be2d98": "patches/@navfolio%2Ftheme-default@github%3Anavfolio%2Ftheme-default#0be2d98.patch"
  },
```

重新安装以应用补丁：

```bash
bun install
rg -n "sitemap-index" node_modules/@navfolio/theme-default/src/components/BaseHead.astro
```

Expected: 输出 `href={assetPath('sitemap-index.xml')}`。

- [ ] Step 8: 在 `package.json` 的 `scripts` 中加入检查命令

```json
    "check:base": "node scripts/check-base-paths.mjs /DoubleX https://jianchuxin.github.io/DoubleX",
```

- [ ] Step 9: 重新构建并检查（预期通过）

```bash
bun run build
bun run check:base
```

Expected: `OK: dist 内链接全部带 /DoubleX 前缀（site: https://jianchuxin.github.io/DoubleX）`。

- [ ] Step 10: 提交（包含 `bun.lock` 的补丁登记）

```bash
git add -A
git commit -m "fix: harden base path handling for GitHub Pages project page"
```

---

### Task 5: 品牌、站点配置、模块裁剪与占位资产

**Files:**

- Create: `public/images/avatar.svg`
- Modify: `public/favicon.svg`
- Modify: `navfolio.config.ts`（关闭 vibe / media 模块）
- Modify: `src/config/site.toml`（整体重写）
- Modify: `docs/superpowers/specs/2026-10-14-doublex-design.md`（两处对齐）

- [ ] Step 1: 创建占位头像 `public/images/avatar.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 176" role="img" aria-label="DoubleX">
  <rect width="176" height="176" rx="88" fill="#33684e"/>
  <text x="88" y="112" font-family="system-ui, sans-serif" font-size="64" font-weight="700" fill="#fdfdf9" text-anchor="middle">DX</text>
</svg>
```

- [ ] Step 2: 替换 `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="DoubleX">
  <rect width="64" height="64" rx="14" fill="#33684e"/>
  <text x="32" y="42" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="#fdfdf9" text-anchor="middle">DX</text>
</svg>
```

- [ ] Step 3: `navfolio.config.ts` 改为只启用 projects 模块

```ts
import { pages, projectsModule } from '@navfolio/pages';
import { markdownPlugin } from '@navfolio/plugin-markdown';

import { defineNavfolioConfig } from './src/plugins/config';

export default defineNavfolioConfig({
  modules: [projectsModule()],
  plugins: [
    markdownPlugin({
      expressiveCode: true,
      layouts: true,
      math: {
        enabled: true,
      },
      mermaid: true,
      responsiveTables: true,
    }),
    pages(),
  ],
});
```

- [ ] Step 4: 用以下内容整体替换 `src/config/site.toml`

```toml
[config.site]
title = "DoubleX"
description = "简楚欣的个人网站：作品集与博客。"
pageTitle = "DoubleX | 个人网站"
pageDescription = "前端开发者的个人空间：作品、笔记与正在做的事。"
url = "https://jianchuxin.github.io/DoubleX"
repository = "https://github.com/jianchuxin/DoubleX"
footerNote = "基于 navfolio 主题构建 · Astro + GitHub Pages"

[config.theme]
# 可用色盘：
# green-soft, green-vivid, rose-soft, pink-soft, purple-soft, blue-soft, orange-soft, brown-soft
palette = "green-soft"
# 原生 UI 语言。可用值：en、zh-CN、zh-TW。
lang = "zh-CN"

[config.fonts]
# 英文与代码感 UI 字体
en = "Maple Mono"
code = "Monaco"
# 模板内可直接选择：ChillRoundM、LXGW WenKai
zh = "ChillRoundM"
file = "/fonts/ChillRoundM.ttf"

[config.code]
lightTheme = "catppuccin-latte"
darkTheme = "catppuccin-macchiato"
lineNumbers = true
wrap = true
preserveIndent = true
collapseStyle = "collapsible-auto"

[config.math]
render = "katex" # "katex" | "mathjax"

[config.comments]
enabled = false
provider = "none"
show_on_posts = true

[config.search]
enabled = true
shortcut = "mod+k"
placeholder = "搜索笔记…"
maxResults = 6

[config.pages.blog]
title = "博客"
kicker = "随笔与笔记"
subtitle = "记录学习、构建与踩坑。"
note = "长文、教程与项目笔记，按时间与主题整理。"
postsPerPage = 6
dateFormat = "yyyy-MM-dd"
metadataSeparator = "icon"
coverImageStyle = "mask"

[config.pages.blog.categories]
title = "分类"
kicker = "按主题浏览"
subtitle = ""
note = "从文章 frontmatter 聚合出的主题索引。"

[config.pages.blog.series]
title = "系列"
kicker = "阅读路径"
subtitle = ""
note = "可以按顺序连续阅读的相关文章。"

[config.pages.projects]
title = "项目"
kicker = "作品架"
subtitle = "做过的东西与正在做的事。"
note = "每个项目是一份简报：为什么做、解决了什么、后续怎么走。"

[config.profile]
name = "简楚欣"
handle = "@jianchuxin"
role = "前端开发者"
email = "hi@example.com"
website = "https://jianchuxin.github.io/DoubleX/"
github = "https://github.com/jianchuxin"
avatar = "/images/avatar.svg"

[[config.topNav.links]]
label = "首页"
href = "/"

[[config.topNav.links]]
label = "博客"
href = "/blog"

[[config.topNav.links]]
label = "项目"
module = "projects"

[[config.topNav.links]]
label = "关于"
href = "/about"

[config.home]

[config.home.featured]
enabled = true
count = 2

[config.home.quote]
text = [
  "把想法做出来，",
  "把做过的事讲清楚，",
  "让作品自己说话。",
]

[config.home.intro]
title = "这里是 DoubleX"
name = "DoubleX"
body = [
  "我是一名前端开发者，喜欢把想法做成真正能用的东西。",
  "DoubleX 是我的个人空间：放作品、写笔记，也记录正在做的事。",
  "内容会持续更新，欢迎常来看看。",
]

[config.home.latest]
count = 1
heatmapWeeks = 24
showHeatmapLatest = true
excludeDraft = true
startDate = ""
dateArchiveBaseHref = ""

[[config.home.navigation]]
icon = "compass"
title = "项目"
subtitle = "作品与项目简报"
href = "/projects"

[[config.home.navigation]]
icon = "pen"
title = "博客"
subtitle = "文章、笔记与教程"
href = "/blog"

[[config.home.navigation]]
icon = "briefcase"
title = "关于"
subtitle = "我是谁、在做什么"
href = "/about"

[[config.home.navigation]]
icon = "github"
title = "GitHub"
subtitle = "代码、实验和工具"
href = "https://github.com/jianchuxin"

[[config.home.links]]
label = "GitHub"
icon = "github"
tooltip = "https://github.com/jianchuxin"
copy = false

[[config.home.links]]
label = "Email"
icon = "mail"
tooltip = "hi@example.com"
copy = true

[[config.home.links]]
label = "RSS"
icon = "rss"
tooltip = "/rss.xml"
copy = false

[[config.home.doing]]
text = "搭建 DoubleX 个人网站"
mark = "01"

[[config.home.doing]]
text = "整理作品与项目笔记"
mark = "02"

[[config.home.doing]]
text = "学习 Astro 与静态站点工程"
mark = "03"
```

- [ ] Step 5: 更新 spec 两处（对齐实现范围）

`docs/superpowers/specs/2026-10-14-doublex-design.md`：

- `2 个示例项目（含封面、标签、外链）` → `2 个示例项目（标签、外链；封面随真实项目补充）`
- `品牌替换为 DoubleX：站点标题、描述、favicon 组、OG 图、页脚署名` → `品牌替换为 DoubleX：站点标题、描述、favicon.svg、页脚署名（PNG 图标组与 OG 图为后续事项）`

- [ ] Step 6: 构建 + 检查 + 抽查页面内容

```bash
export GITHUB_ACTIONS=true GITHUB_REPOSITORY=jianchuxin/DoubleX GITHUB_REPOSITORY_OWNER=jianchuxin
bun run build
bun run check:base
rg -o "简楚欣|DoubleX|/DoubleX/images/avatar.svg" dist/index.html | sort | uniq -c
```

Expected: check:base 通过；`简楚欣`、`DoubleX`、`/DoubleX/images/avatar.svg` 各至少一次。

- [ ] Step 7: 提交

```bash
git add -A
git commit -m "chore: brand the site as DoubleX with placeholder profile"
```

---

### Task 6: 首页精选项目区块

**Files:**

- Create: `src/components/cards/FeaturedProjectsCard.astro`
- Modify: `src/components/layout/DashboardFlow.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/content.config.ts`

- [ ] Step 1: 创建 `src/components/cards/FeaturedProjectsCard.astro`（完整内容）

```astro
---
import { getCollection } from 'astro:content';
import FormattedDate from '../FormattedDate.astro';
import { sortBlogPostsForArchive } from '../../utils/content-dates';

interface Props {
  enabled?: boolean;
  count?: number;
}

const { enabled = true, count = 2 } = Astro.props;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const projectsHref = `${basePath}/projects/`;

const entries = await getCollection('projects', ({ data }) => !data.draft);
const featured = enabled
  ? sortBlogPostsForArchive(entries.filter((entry) => entry.id !== 'index')).slice(
      0,
      Math.max(1, count),
    )
  : [];
---

{
  featured.length > 0 && (
    <section class="featured-projects" aria-label="精选项目">
      <h2 class="featured-heading">精选项目</h2>
      <ul class="featured-list">
        {featured.map((project) => (
          <li class="featured-item">
            <a class="featured-link" href={`${projectsHref}${project.id}/`}>
              <span class="featured-title">{project.data.title}</span>
              <span class="featured-meta">
                <FormattedDate date={project.data.date} />
                {project.data.tags.slice(0, 3).map((tag) => (
                  <small>{tag}</small>
                ))}
              </span>
              <span class="featured-desc">{project.data.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

<style>
  .featured-projects {
    display: grid;
    gap: 12px;
    padding: 4px 0 12px;
  }
  .featured-heading {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--paper-ink-faint);
  }
  .featured-list {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .featured-link {
    display: grid;
    gap: 6px;
    padding: 14px 16px;
    border: 1px solid var(--paper-line);
    border-radius: 8px;
    background: var(--paper-surface);
    color: inherit;
    text-decoration: none;
    transition:
      border-color 180ms ease,
      background 180ms ease,
      transform 180ms ease;
  }
  .featured-link:hover {
    border-color: var(--paper-line-strong);
    background: var(--paper-control-hover);
    transform: translateY(-1px);
  }
  .featured-title {
    font-family: var(--font-ui-label);
    font-size: 1.05rem;
    font-weight: 600;
  }
  .featured-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    color: var(--paper-ink-faint);
    font-family: var(--font-ui-label);
    font-size: 0.74rem;
  }
  .featured-meta small {
    padding: 2px 8px;
    border: 1px solid var(--paper-line);
    border-radius: 999px;
  }
  .featured-desc {
    color: var(--paper-ink-soft);
    font-size: 0.9rem;
    line-height: 1.7;
  }
</style>
```

- [ ] Step 2: `src/components/layout/DashboardFlow.astro` 主列加入插槽

```diff
     <section class="flow-column main-column">
       <slot name="intro" />
+      <slot name="featured" />
       <slot name="doing" />
     </section>
```

- [ ] Step 3: `src/pages/index.astro` 填充插槽（完整新内容）

```astro
---
import IntroCard from '../components/cards/IntroCard.astro';
import ConnectCard from '../components/cards/ConnectCard.astro';
import FeaturedProjectsCard from '../components/cards/FeaturedProjectsCard.astro';
import NavigationCard from '../components/cards/NavigationCard.astro';
import ProfileCard from '../components/cards/ProfileCard.astro';
import DashboardFlow from '../components/layout/DashboardFlow.astro';
import BlogHeatmap from '../components/widgets/BlogHeatmap.astro';
import DoingCard from '../components/widgets/DoingCard.astro';
import { getSiteConfig } from '../data/site';
import BaseLayout from '../layouts/BaseLayout.astro';

const { home, profile, site } = await getSiteConfig();
---

<BaseLayout title={site.pageTitle} description={site.pageDescription}>
  <div class="publication-bg" aria-hidden="true"></div>
  <DashboardFlow>
    <Fragment slot="profile">
      <ProfileCard profile={profile} />
    </Fragment>

    <Fragment slot="intro">
      <IntroCard intro={home.intro} quote={home.quote} />
    </Fragment>

    <Fragment slot="featured">
      <FeaturedProjectsCard enabled={home.featured.enabled} count={home.featured.count} />
    </Fragment>

    <Fragment slot="latest">
      <BlogHeatmap
        weeks={home.latest.heatmapWeeks}
        showLatest={home.latest.showHeatmapLatest}
        latestCount={home.latest.count}
        excludeDraft={home.latest.excludeDraft}
        startDate={home.latest.startDate || null}
        dateArchiveBaseHref={home.latest.dateArchiveBaseHref || undefined}
      />
    </Fragment>

    <Fragment slot="navigation">
      <NavigationCard items={home.navigation} />
    </Fragment>

    <Fragment slot="connect">
      <ConnectCard links={home.links} />
    </Fragment>

    <Fragment slot="doing">
      <DoingCard items={home.doing} />
    </Fragment>
  </DashboardFlow>
</BaseLayout>
```

- [ ] Step 4: `src/content.config.ts` 的 home schema 增加 `featured`

在 `latest` 字段块之后、`navigation` 之前插入：

```ts
      featured: z
        .object({
          enabled: z.boolean().optional().default(true),
          count: z.number().int().positive().optional().default(2),
        })
        .optional()
        .default({ enabled: true, count: 2 }),
```

- [ ] Step 5: 构建 + 验证

```bash
export GITHUB_ACTIONS=true GITHUB_REPOSITORY=jianchuxin/DoubleX GITHUB_REPOSITORY_OWNER=jianchuxin
bun run build
rg -c "精选项目" dist/index.html
rg -o "DoubleX 个人网站|示例项目（待替换）" dist/index.html | sort -u
bun run check:base
```

Expected: `精选项目` 至少出现 1 次；两个项目标题都出现；check:base 通过。

- [ ] Step 6: 提交

```bash
git add -A
git commit -m "feat: add featured projects section to homepage"
```

---

### Task 7: CI/CD 工作流

**Files:**

- Modify: `.github/workflows/deploy-pages.yml`（整文件重写）
- Create: `.github/workflows/ci.yml`

- [ ] Step 1: 重写 `.github/workflows/deploy-pages.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install font subsetting tools
        run: |
          python3 -m venv .venv
          .venv/bin/pip install --upgrade pip fonttools brotli

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build site
        run: bun run build

      - name: Check base paths
        run: bun run check:base

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] Step 2: 创建 `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches-ignore: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install font subsetting tools
        run: |
          python3 -m venv .venv
          .venv/bin/pip install --upgrade pip fonttools brotli

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build site
        run: bun run build

      - name: Check base paths
        run: bun run check:base
```

- [ ] Step 3: 提交

```bash
git add .github
git commit -m "ci: build and deploy via Bun with base path checks"
```

---

### Task 8: README 重写

**Files:**

- Modify: `README.md`

- [ ] Step 1: 用以下内容整体替换 `README.md`

````markdown
# DoubleX

简楚欣的个人网站：作品集与博客。基于 [navfolio](https://github.com/dodolalorc/astro-navfolio)（MIT）定制。

- 线上地址：https://jianchuxin.github.io/DoubleX/

## 技术栈

- Astro 7 + Tailwind CSS 4 + TypeScript，内容用 Markdown / MDX（Content Collections + Zod 校验）
- Bun 包管理，Node >= 22.12
- Python fontTools / brotli：构建期按实际用字生成中文字体子集
- Pagefind 全文搜索（Cmd/Ctrl+K）
- GitHub Pages + GitHub Actions 自动部署

## 本地开发

```bash
python3 -m venv .venv
.venv/bin/pip install fonttools brotli
bun install
bun run dev          # http://localhost:4321
bun run build        # 构建到 dist/（含字体子集与搜索索引）
bun run check:base   # 校验 /DoubleX/ 子路径链接（需先构建）
```

网络慢时给命令加代理，例如：

```bash
export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897
```

## 内容怎么改

- 文章：`src/content/blog/`（`bun run post:new 文件名`）
- 项目：`src/content/projects/`（`bun run project:new 文件名`；索引说明在 `index.mdx`）
- 关于：`src/content/about.mdx`
- 站点信息（名字、邮箱、导航、首页文案）：`src/config/site.toml`

## 部署

推送到 `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建并发布到 GitHub Pages；
PR 与非 main 分支由 `.github/workflows/ci.yml` 做构建校验。
````

- [ ] Step 2: 提交

```bash
git add README.md
git commit -m "docs: rewrite README for DoubleX"
```

---

### Task 9: PR、CI、合并与上线验证

**Files:** 无代码改动（GitHub 操作）

- [ ] Step 1: 推送分支

```bash
git push -u origin feat/navfolio-base
```

- [ ] Step 2: 创建 PR（GitHub API，令牌取自 macOS keychain）

```bash
TOKEN=$(security find-internet-password -s github.com -w)
curl -s -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/jianchuxin/DoubleX/pulls \
  -d '{"title":"feat: adopt navfolio v1 as DoubleX base","head":"feat/navfolio-base","base":"main","body":"引入 navfolio v1 底座：品牌、占位内容、子路径修复（含依赖补丁）、CI/CD。详见 docs/superpowers/specs 与 plans。"}'
```

- [ ] Step 3: 轮询 CI 直至完成（期望成功；失败则修复后追加提交再推）

```bash
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/jianchuxin/DoubleX/actions/runs?branch=feat%2Fnavfolio-base&per_page=5"
```

- [ ] Step 4: 合并 PR（merge commit）

```bash
PR_NUMBER=<上一步返回的编号>
curl -s -X PUT -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/jianchuxin/DoubleX/pulls/$PR_NUMBER/merge" \
  -d '{"merge_method":"merge"}'
```

- [ ] Step 5: 等待 main 的 `Deploy to GitHub Pages` 成功

- [ ] Step 6: 线上验证

```bash
curl -s -o /tmp/doublex-live.html -w "%{http_code}\n" https://jianchuxin.github.io/DoubleX/
rg -o "DoubleX|精选项目|简楚欣" /tmp/doublex-live.html | sort | uniq -c
for p in /DoubleX/rss.xml /DoubleX/sitemap-index.xml /DoubleX/blog/ /DoubleX/projects/ /DoubleX/about/; do
  printf "%s -> " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "https://jianchuxin.github.io$p"
done
```

Expected: 首页 200 且包含关键词；五个路径全部 200。

- [ ] Step 7: 更新 spec 状态并收尾

把 `docs/superpowers/specs/2026-10-14-doublex-design.md` 顶部状态行改为
`状态：已实现并上线（2026-10-14）`，提交并推送：

```bash
git add docs/superpowers/specs/2026-10-14-doublex-design.md
git commit -m "docs: mark design spec as implemented"
git push origin main
```

---

## 验收清单（对应 spec 第 10 节）

- [ ] 本地 `bun run build` 通过、`bun run dev` 可用
- [ ] `bun run check:base` 0 泄漏
- [ ] PR CI 绿；合并 main 后部署成功
- [ ] 线上：首页 / 项目 / 博客 / 关于 / 搜索（Cmd+K）/ RSS / sitemap / 404 可用
- [ ] 浅深色切换与 8 套配色可用
