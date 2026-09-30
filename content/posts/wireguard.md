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

家里的平板服务器用的是 Linux 3.18，内核里没有 WireGuard 模块。我用 `wireguard-go` 在用户态运行 WireGuard，再配置隧道接口，让手机在外面也能连回家。

这里缺的是内核模块，并不等于 `wg-quick` 这个配置脚本不能安装。把这两件事分清楚，才知道需要替换哪一部分。

## 配置接口

下面是当时用的命令，保留在这里方便查阅：

```bash
# Alpine 安装
apk add wireguard-go wireguard-tools

# 启动用户态接口
wireguard-go wg0
ip addr add 10.9.0.1/24 dev wg0
wg set wg0 listen-port 51820 private-key /etc/wireguard/server_private.key
ip link set wg0 up
```

私钥文件需要提前准备好，手机端的 peer、公钥和地址也要另外配置。这几条命令只是把服务器端接口拉起来，不是完整的两端配置。

## 提示信息和开机启动

`wireguard-go` 会显示内核已有 WireGuard 支持的提示。不过这段提示在 Linux 上不等于它实际检测到了模块，我这台平板仍然使用用户态实现。[源码里的提示逻辑](https://git.zx2c4.com/wireguard-go/tree/main.go)

开机启动使用 OpenRC：先准备 `wg0` 服务，再运行 `rc-update add wg0 default`。只有把服务加入启动列表，重启后才会自动恢复隧道。

手机直接连接家里的公网 IPv6 地址时，还要留意地址变化。地址变了，手机配置里的 `Endpoint` 也要更新，否则原来的地址就连不上了。
