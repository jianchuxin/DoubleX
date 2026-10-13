# DoubleX

个人网站，使用 Astro 构建，通过 GitHub Actions 部署到 GitHub Pages。

## 命令

```bash
npm install      # 安装依赖
npm run dev      # 本地开发 http://localhost:4321
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
npm run check    # 类型检查
```

## 部署

- `main` 分支推送后，GitHub Actions 自动构建并部署到 GitHub Pages。
- 首次需要在仓库 `Settings → Pages → Source` 选择 `GitHub Actions`。
