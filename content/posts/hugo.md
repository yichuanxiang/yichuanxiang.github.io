---
title: "Hugo 博客搭建记录"
date: 2026-08-21T12:00:00+08:00
description: "在平板上用 Hugo + PaperMod 搭博客"
tags: ["博客", "Hugo"]
cover:
  image: "/images/scene-19.jpg"
  alt: "架子上的旧机器"
  hiddenInSingle: true
---

![架子上的旧机器](/images/scene-19.jpg)

## 步骤

1. 装 Hugo：`apk add hugo`（Alpine 官方包，ARM64 直接有）
2. 建站：`hugo new site /srv/blog`
3. 装主题 PaperMod（GitHub 下载 zip 传过去）
4. 配置 `hugo.toml`，中文语言
5. 写文章：`hugo new posts/xxx.md`，编辑后 `hugo` 重建

## 小坑

- TOML 配置里中文要确保 UTF-8 编码，别用 Windows 记事本乱码
- `baseURL` 要写对，服务启动参数里也要一致，否则页面链接全错
- 静态站发文章 = 编辑 md + 跑一下 hugo，几毫秒就发布
