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
