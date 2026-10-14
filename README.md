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
