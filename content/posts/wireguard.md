---
title: "WireGuard 组网笔记"
date: 2026-08-21T11:00:00+08:00
description: "老内核设备上用 wireguard-go 跑起加密隧道"
tags: ["网络", "WireGuard"]
cover:
  image: "/images/scene-21.jpg"
  alt: "夜色里的隧道"
  hiddenInSingle: true
---

![夜色里的隧道](/images/scene-21.jpg)

## 背景

家里的服务器是台内核很老的平板（3.18），内核里没有 WireGuard 模块，装不上官方的 wg-quick。

## 解决方案

用 **wireguard-go**（纯用户态实现）绕开内核限制：

```bash
# Alpine 安装
apk add wireguard-go wireguard-tools

# 启动用户态接口
wireguard-go wg0
ip addr add 10.9.0.1/24 dev wg0
wg set wg0 listen-port 51820 private-key /etc/wireguard/server_private.key
ip link set wg0 up
```

## 坑

- 老内核虽然没有模块，但 wireguard-go 检测到「内核第一类支持」的提示可以忽略，用户态照常工作
- 记得配开机自启（OpenRC `rc-update add wg0 default`）
- 公网 IPv6 地址会变，变了要更新手机的 Endpoint
