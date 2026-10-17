<div align="right">

[English](README.md) · **[简体中文](README.zh-CN.md)**

</div>

# doubao-free

一个在浏览器层绕过豆包网页端常见交互限制的 Chrome 扩展。

<sub>Chrome MV3 · 11 个文件</sub>

---

## 做什么

豆包网页版会限制某些交互操作。这个扩展在浏览器层绕过这些限制。

## 结构

```
扩展根目录
├── manifest.json      MV3 清单
├── content/           注入页面上下文的脚本
└── background/        服务工作线程
```

作为 Manifest V3 扩展，它区分了页面上下文的内容脚本和后台服务工作线程，遵守 Chrome 强制的边界。

## 安装

1. 加载未打包扩展：chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择本目录
2. 启用
3. 在浏览器里打开豆包

## 说明

依赖它之前，先读清楚这个扩展的意图。脚本会修改页面行为，所以请确认包的内容和你预期的一致。保留公开是为了参考和研读 MV3 的模式。

## 许可证

MIT