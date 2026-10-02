---
title: "用小米平板 3 搭一个独立 Wi-Fi 网关"
date: 2026-10-02T12:00:00+08:00
description: "JTTI 更换 IP 后，用 Alpine 平板运行 Xray 与 DHCP，让睿易提供 Wi-Fi。记录部署过程、断线保护、验收和回退步骤。"
tags: ["网络", "服务器", "折腾", "小米平板3"]
draft: false
ShowToc: true
TocOpen: false
cover:
  image: "/images/tablet-gateway-topology.svg"
  alt: "客户端通过睿易 Wi-Fi 和小米平板网关连接 Cloudflare 入口与 JTTI VPS 的网络结构"
  hiddenInSingle: true
---

这次折腾的目标很直接：让家里的设备连上一个独立 Wi-Fi 就能使用现有节点，电脑关机以后，这个 Wi-Fi 也能继续工作。

最终由**小米平板 3 运行 Xray、DHCP 和网关保护，睿易 RG-EW1300G 提供 Wi-Fi 与上游连接**。手机或电脑连接 **Accelerator** 后，把流量交给平板；电脑上的 v2rayN 不需要一直开着。

本文整理的是 **2026 年 10 月 2 日**的配置与验收记录。公网 IP、节点域名、远程管理地址和本机路径使用占位示例，节点身份参数、密钥和完整配置文件不公开。

## 网络是怎么走的

![客户端 → 睿易 Wi-Fi → 小米平板网关 → 上游网络 → Cloudflare 节点入口 → JTTI VPS → 目标网站](/images/tablet-gateway-topology.svg)

这里最容易混淆的是两个默认网关：

- **客户端的默认网关是平板：`192.168.110.2`。**
- **平板自己的默认网关是睿易：`192.168.110.1`。**

睿易继续负责无线接入和上游联网。平板收到客户端流量后，通过 Xray 连接节点。Cloudflare 提供节点入口，本次测得的网站出口仍然是 JTTI 的 VPS IP。

## 先处理 JTTI 更换 IP

这次部署之前，JTTI 更换了公网 IP。我先把 Cloudflare 中节点域名的 A 记录更新为新的 VPS IP，并保持橙云“已代理”。

客户端条目里同时有“域名入口”和“直连新 IP”两种地址，排查时要区分它们：直连 IP 的条目直接连接 VPS，填写节点域名的条目使用域名入口。平板最终采用的是**域名入口**。

平板使用的节点方式为 **VLESS / XHTTP / TLS**，入口端口为 `8443`，TLS 证书校验保持开启。域名、节点身份参数和 XHTTP 路径需要使用自己的配置，不能直接照抄这篇文章里的占位值。

## 平板做网关，睿易提供 Wi-Fi

平板已经运行 Alpine Linux，这次在它上面部署了 Xray ARM64，当时使用的版本为 `26.3.27`。运行配置放在 `/srv/tablet-gateway/`。

平板连接睿易的 **Accelerator** Wi-Fi，固定为 `192.168.110.2/24`，自身仍然通过 `192.168.110.1` 访问上游网络。

接下来交接 DHCP：**关闭睿易的 DHCP，由平板给客户端分配地址、默认网关和 DNS。** 同一网段里不能让两套 DHCP 同时分配地址，否则设备可能拿到不同的网关。

| 项目 | 本次配置 |
| --- | --- |
| 无线名称 | `Accelerator` |
| 睿易型号 | RG-EW1300G |
| 睿易管理地址 | `http://192.168.110.1` |
| 睿易 WAN | 动态 IP 上网 |
| 睿易 DHCP | 关闭 |
| 平板固定地址 | `192.168.110.2/24` |
| 客户端默认网关 | `192.168.110.2` |
| 平板自身默认网关 | `192.168.110.1` |
| DHCP 地址池 | `192.168.110.100`—`192.168.110.249` |
| DHCP 租期 | 12 小时 |
| DHCP 下发的 DNS | `9.9.9.9`、`1.1.1.1` |
| 节点入口 | `<节点域名>:8443` |
| 节点方式 | VLESS / XHTTP / TLS |

DNS 地址是 DHCP 下发值；按照本次网关配置，使用平板网关的客户端外部 DNS 流量也经过节点。

为了处理 IPv6 绕行，睿易 LAN 侧的 IPv6 地址分配设为“无”，平板拒绝客户端 IPv6 转发。睿易 WAN 原有的 IPv6 配置保留。

## 加上断线保护，再做验收

这次配置了三个 OpenRC 服务：

| 服务 | 作用 |
| --- | --- |
| `cappu-jtti-guard` | 独立网关保护，在代理网关前启动 |
| `cappu-jtti-gateway` | Xray 与客户端代理网关 |
| `cappu-jtti-dhcp` | 给客户端分配地址、网关和 DNS |

独立保护服务的意义是：停止代理网关后，防火墙阻断规则仍然保留，拒绝客户端直接转发到外网。平板同时关闭发送和接受 ICMP 重定向，避免把客户端引导到睿易网关。

我还清理了 JTTI 上闲置的 OpenVPN 入口：停用 `openvpn-server@router`，移除 UDP `1194` 的开放规则以及旧的 OpenVPN 转发、NAT 规则。原有证书和客户端文件作为恢复资料保留。路由器检查时，UPnP 和 NAT-DMZ 都关闭，端口映射为空。

### 当天实际验证了什么

Windows 连接 Accelerator 后，获得了 `192.168.110.201`，默认网关为 `192.168.110.2`。其他设备可能拿到地址池里的其他 IP，这个地址只是当时的测试结果。

| 测试 | 2026-10-02 的结果 |
| --- | --- |
| 绕过电脑本机代理，查询 IPv4 出口 | 返回 JTTI 的新 VPS IP |
| 访问 Google 连通性测试地址 | 返回 HTTP `204` |
| 主动停止平板代理网关服务 | 客户端外部请求被阻断，保护规则保留 |
| 恢复相关服务后再次测试 | 出口查询和 Google 连通测试通过 |

这里的断线验收是**主动停止平板网关服务**。这些结果不能扩大成所有设备、所有协议或所有远端故障都已经验证。

保护范围也有明确边界：它只覆盖**经过平板网关的流量**。切换到其他 Wi-Fi、移动数据，或手动把网关改成睿易，都会走相应的网络。

## 日常使用与检查

日常使用时，保持平板、睿易、上游路由器和网络运行，设备连接 Accelerator，并让 IP 和 DNS 自动获取即可。**电脑可以关机。**

如果设备还保留旧网关，断开 Wi-Fi 后重新连接，确认默认网关变成 `192.168.110.2`。排查时也要先确认设备没有自动切回其他 Wi-Fi；本次测试中就遇到过 Windows 自动连接回原来的网络。

### 查看平板服务

通过自己的远程管理地址登录平板。下面的占位值需要替换；密钥路径按实际文件调整：

```powershell
$tabletAddress = '<平板的 Tailscale 地址>'
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" "root@$tabletAddress"
```

在平板上检查：

```sh
rc-service cappu-jtti-guard status
rc-service cappu-jtti-gateway status
rc-service cappu-jtti-dhcp status
```

正常情况下三个服务均显示 `started`。维护时停止网关，OpenRC 可能连带停止依赖它的 DHCP；恢复时按以下顺序启动：

```sh
rc-service cappu-jtti-guard start
rc-service cappu-jtti-gateway start
rc-service cappu-jtti-dhcp start
```

### 从客户端验收

电脑连接 Accelerator 后，在 PowerShell 中执行。`--noproxy '*'` 用来绕过电脑本机代理，`-4` 明确测试 IPv4：

```powershell
curl.exe --noproxy '*' -4 --max-time 15 https://api.ipify.org
curl.exe --noproxy '*' -4 --max-time 15 -s -o NUL -w '%{http_code}' https://www.google.com/generate_204
```

本次第一条返回新的 JTTI VPS IP，第二条返回 `204`。失败时先检查所连接的 Wi-Fi、默认网关和服务状态，不能仅凭客户端显示 `-1` 就判断 VPS 被封锁。

## 怎样恢复普通直连 Wi-Fi

回退会短暂断网。操作顺序要避免两套 DHCP 同时工作：

1. 通过 Tailscale SSH 登录平板，执行 `rc-service cappu-jtti-dhcp stop`。
2. 打开睿易 `http://192.168.110.1` 的 LAN 设置，重新开启 DHCP，确认下发网关为 `192.168.110.1`。
3. 在平板执行 `rc-service cappu-jtti-gateway stop`。
4. 客户端断开 Wi-Fi 后重新连接，确认默认网关已经变为 `192.168.110.1`。
5. 如永久停用这套方案，再移除三个服务的自动启动：

```sh
rc-update del cappu-jtti-dhcp default
rc-update del cappu-jtti-gateway default
rc-update del cappu-jtti-guard default
```

保护服务停止后仍会保留阻断规则。改用睿易作网关的客户端不经过平板，因此不受这些规则影响。

如果需要恢复 LAN IPv6，再到睿易的 IPv6 设置 → LAN 配置，将地址分配方式恢复为“自动”。

## 配置、备份与还没验证的部分

| 内容 | 位置 |
| --- | --- |
| 平板运行配置 | `/srv/tablet-gateway/` |
| 平板原 Wi-Fi 配置备份 | `/srv/tablet-gateway/backup/` |
| 平板加固前备份 | `/srv/tablet-gateway/security-backup-20261002/` |
| JTTI OpenVPN 清理前备份 | `/root/network-security-20261002/` |
| 本地部署资料 | 本机保存的 `tablet-gateway/` 目录 |
| 初次联网验收 | 本地 `validation.json` |
| 加固验收 | 本地 `security-validation.json` |

这些是维护时查找资料的位置。完整节点配置、Wi-Fi 配置、客户端 XML 和备份文件包含身份信息或密钥，不随文章上传。

平板仍使用 Linux `3.18.35-g59c67c58`，这次没有升级内核，配置加固不能替代内核安全维护。三个新服务已经加入 OpenRC 默认启动级别，**整台平板重启后的恢复还没有验收**。

这套实现最终使用 Xray 和已有域名入口，没有采用 sing-box 或睿易直接连接旧 OpenVPN 的方案。Cloudflare 和网关改变的是入口与流量路径，访问网站的出口仍是 VPS，也不会因此变成住宅 IP。
