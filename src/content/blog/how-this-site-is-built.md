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
