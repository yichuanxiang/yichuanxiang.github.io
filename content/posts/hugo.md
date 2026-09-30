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

这个博客最初搭在小米平板 3 上。平板运行 Alpine Linux，仓库里有 ARM64 版本的 Hugo，直接用 `apk add hugo` 安装就行。

## 最初的搭建过程

我用 `hugo new site /srv/blog` 建站，把 PaperMod 主题从 GitHub 下载成 zip，再传到平板上。站点名称、中文语言和菜单都放在 `hugo.toml` 里配置。

新文章用 `hugo new posts/xxx.md` 创建，正文写 Markdown。保存以后运行 `hugo`，就会重新生成页面。生成本身很快，不过生成页面和把页面发布到公网是两件事。

## 链接和编码要对上

配置文件和文章都要保存为 UTF-8，中文才不会乱码。

`baseURL` 也要和实际访问地址一致。如果配置里写一个地址，启动参数或发布时又用了另一个，导航、文章封面和 RSS 就可能指向旧地址。首页能显示，不代表文章链接也能打开。

## 现在怎么发布

公开版本已经迁到 [GitHub Pages](https://yichuanxiang.github.io/)。源码里保留 Hugo 和 PaperMod，推送到 `main` 后，GitHub Actions 会构建并发布站点。

现在发文章主要是编辑 `content/posts/` 下的 Markdown 文件，再提交和推送。草稿里的 `draft: true` 要改掉，日期也不能写到未来，否则默认构建不会发布它。

本地运行 `hugo` 的速度和 GitHub 上的构建、部署时间不同。推送完成后，我会再打开网页，检查文章和图片是否确实更新。
