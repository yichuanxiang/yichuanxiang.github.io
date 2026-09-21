param(
    [string]$Slug = '',
    [string]$Title = ''
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($Slug)) {
    Write-Host ''
    Write-Host '文件名会变成网址，建议用英文或拼音。'
    Write-Host '例如：my-trip  →  https://yichuanxiang.github.io/posts/my-trip/'
    Write-Host ''
    $Slug = Read-Host '文件名（英文/拼音）'
}

$slug = $Slug.Trim()
if ($slug -match '\.md$') { $slug = $slug.Substring(0, $slug.Length - 3) }
if ([string]::IsNullOrWhiteSpace($slug)) {
    Write-Host ''
    Write-Host '没有输入文件名，已取消。'
    Start-Sleep -Seconds 3
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Title)) {
    $Title = Read-Host '文章标题（可中文，直接回车就用文件名）'
}

$postsDir = Join-Path $root 'content\posts'
if (-not (Test-Path $postsDir)) { New-Item -ItemType Directory -Path $postsDir | Out-Null }

$file = Join-Path $postsDir ($slug + '.md')
if (Test-Path $file) {
    Write-Host ''
    Write-Host ('已经存在同名文件，没有覆盖：' + $file)
    Start-Sleep -Seconds 3
    exit 2
}

if ([string]::IsNullOrWhiteSpace($Title)) { $name = $slug } else { $name = $Title.Trim() }
$date = Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz'

$template = @'
---
title: "{{TITLE}}"
date: {{DATE}}
description: "一句话简介，会显示在首页列表"
tags: ["随笔"]
draft: false
---

正文从这里开始，用 Markdown 写。

## 小标题

- 列表项 1
- 列表项 2

**加粗**、*斜体*、`代码` 都支持。

## 图片

图片放进 static/images/ 目录，然后这样引用：

![图片说明](/images/图片名.jpg)

## 代码块

```bash
echo "hello"
```

## 提醒

- 想先不上线，就把上面的 draft 改成 true（草稿不会被发布）。
- 写完保存，双击「发布博客.bat」即可上线。
'@

$body = $template.Replace('{{TITLE}}', $name).Replace('{{DATE}}', $date)
$body = $body -replace "`r`n", "`n"

[System.IO.File]::WriteAllText($file, $body, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ''
Write-Host ('已创建：' + $file)
Write-Host '马上用记事本打开，写完后保存，再双击「发布博客.bat」就上线。'
Start-Process notepad $file
exit 0
