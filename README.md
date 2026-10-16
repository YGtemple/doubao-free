# doubao-free · 豆包自由版

> 一句话简介：Chrome/Edge 扩展，让豆包的图片和视频能存无水印原图，并把视频生成时长从 10 秒解锁到 15 秒。

## 一、这个插件在解决什么问题

用豆包生成图片和视频的人，大概都遇到过这两个膈应人的地方：

**第一，水印只能拍屏。** 豆包界面上下载下来的图和视频带着水印，想要干净的版本只能截图。但截图会掉分辨率、掉画质，视频更是完全没法截。实际上去水印根本不需要破解什么——豆包后端返回的数据里**本来就有无水印的原图地址**（`image_ori_raw.url` 字段），水印只是前端渲染时盖在上面的一层。只是这个字段被埋在层层嵌套的 JSON 里，页面上没给入口。

**第二，视频最长只能选 10 秒。** 豆包用的 Seedance 2.0 模型底层是支持 4–15 秒生成的，但界面上的时长选项只放了 5 秒和 10 秒两档，想再多要几秒没有入口。

这个插件就是把这两个被界面藏起来的开关掰出来：劫持页面的网络请求，从后端响应里把无水印地址取出来，直接在图片和视频上挂下载按钮；同时拦截视频生成请求，把 `duration` 参数改成 15。

## 二、核心实现思路

### 1. 无水印地址的抓取

难点在于豆包是个 SPA，接口返回的数据形态不止一种。插件用**劫持 + 遍历**双管齐下：

| 劫持点 | 抓什么 |
|---|---|
| `JSON.parse` | 全站 JSON 解析必经之路，劫持后统一交给 `harvest()` 深挖 |
| `window.fetch` | 普通 JSON 响应整段读出；SSE 流按 `\n\n` 切帧后逐帧挖 |
| `XMLHttpRequest.prototype.send` | 监听 `load`，针对 `chain/single` 接口单独处理 |
| `history.pushState` | SPA 路由切换时重新触发 DOM 扫描 |

`harvest()` 是核心的深挖函数，用 `walkJSON` 递归遍历（深度上限 20 层）所有节点，匹配四种不同埋点路径：

```js
node?.content?.creation_block?.creations           // 常规创块
node?.downlink_body?.pull_singe_chain_downlink_body?.messages   // 下拉链路
node?.patch_op[]?.patch_value?.content_block[]     // 增量补丁
node?.patch_op[]?.patch_value                      // 补丁里的视频 id
```

图片方面，从 `creations[].image.image_ori_raw.url` 中提取 `file_key` 作为主键，建 `imageDb` 索引；视频则递归找 `vid`/`video_id` 字段，以 `message_id` 为键建 `videoDb`。

### 2. 按钮的注入与绑定

最初按 DOM 下标顺序给按钮配对，多轮生成或页面刷新后就会错位——按钮挂到别的图上去了。现在的做法是**按钮的 file_key 直接从容器内部 DOM 提取**，每次注入时校验 `data-key` 是否与当前 DOM 一致，不一致就删掉重建。配合最多 30 次、间隔 1 秒的重试循环，保证数据和按钮一一对应。

注入点不是靠猜容器，而是用 `source[srcset*="signature"]` 精确定位图片容器（排除 avatar、图标等噪声），再向上找到尺寸合适的父元素。

### 3. 15 秒解锁

```js
// 关键定位：chat_ability.ability_type === 17（视频生成）
// ability_param 是一个 JSON 字符串，藏在字段里面
if (obj.chat_ability && Number(obj.chat_ability.ability_type) === 17) {
  const param = JSON.parse(ability.ability_param)
  param.model    = 'seedance_v2.0'
  param.duration = 15
  ability.ability_param = JSON.stringify(param)
}
```

同样需要递归深挖，因为 `ability_param` 是以字符串形式嵌套的，得先解析成对象再改。同时把 `model` 一并锁定为 `seedance_v2.0`，避免其他模型的提示词结构不兼容。

### 4. 视频地址解析

点「下载视频」时，插件 POST 请求豆包的 `get_play_info` 接口拿播放信息，然后把 URL 里的清晰度参数替换成 `lr=video_gen_no_watermark`：

```js
mainUrl: om.main_url.replace(/lr=[^&]+/g, 'lr=video_gen_no_watermark')
```

### 5. 跨世界通信

MV3 的特性决定了一个麻烦：`content.js` 跑在 `MAIN` world 里才能改页面自身的 `JSON.parse` 和 `fetch`，但 MAIN world 用不了 `chrome.runtime` API。而下载和 storage 必须在 background 里做。

插件的解法是搭一座桥：

```
content.js (MAIN)  ──postMessage──▶  forwarder.js (ISOLATED)
      │                                      │
      └──────── chrome.runtime ◀──────────────┘
                                        │
                                   background.js (下载)
```

所有消息都带 `__DF_` 前缀避免与页面自身消息混淆。

## 三、文件结构

```
doubao-free/
├── manifest.json          # MV3 配置，仅申请 downloads + storage 两项权限
├── content.js             # 核心逻辑（602 行）：劫持、抓取、按钮注入
├── forwarder.js           # MAIN ↔ ISOLATED 消息桥
├── background.js          # service worker，处理实际下载
├── popup.html             # 弹窗页面
├── popup.js               # 弹窗逻辑（模式开关、版本提示）
├── popup.css              # 弹窗样式
├── icon.png               # 蓝色方块图标
├── screenshot.png         # 界面截图
├── screenshot-15s-warning.png  # 提示词写"15秒"被拒的示例
└── README.md
```

## 四、安装与使用

1. 下载这个文件夹，放到一个**不要移动**的位置
2. 打开 `chrome://extensions/`（Edge 用 `edge://extensions/`）
3. 右上角开启「开发人员模式」
4. 点「加载已解压的扩展」，选中本文件夹
5. 重启浏览器，工具栏出现蓝色方块图标即成功

**下载无水印图/视频：** 打开 doubao.com 正常生成，图片右下角出现「下载原图」、视频块上出现「下载视频」，点击即存。

**开 15 秒模式：** 点工具栏图标打开弹窗，拨动「15秒视频模式」开关，之后生成的视频自动变 15 秒；关掉开关恢复默认。

> ⚠️ 开启 15 秒模式后，**提示词里不要出现「15秒」或任何超过 10 秒的时长描述**。豆包前端会据此拒绝生成（提示不支持超过 10 秒），一旦走了这条分支就退化成 10 秒，插件等于白改。把时长描述从提示词里删掉即可。

## 五、项目特点

- **不逆向、不破解**：拿的是后端原本就返回的无水印地址，以及模型本就支持的时长参数，只是界面没开放入口。不碰鉴权、不改请求签名、不绕过任何付费。
- **无卡密无会员无后门**：全套代码就在这 11 个文件里，无外部网络请求、无数据上传、无遥测。
- **权限极小**：只申请 `downloads` 和 `storage`，`host_permissions` 限定 `https://www.doubao.com/*` 一个域名。
- **健壮性考量**：所有劫持和解析都包在 `try/catch` 里，豆包改接口时插件静默失效而不是让页面崩掉；数据未就绪时按钮等待重试，不报错。

## 六、局限

- 依赖豆包当前的前端交互结构，**豆包改版后可能失效**。失效时去 `chrome://extensions/` 点一下刷新，不行就是接口变了，欢迎提 Issue。
- 下载视频需要保持豆包账号登录状态。
- 「15秒」是 Seedance 2.0 的能力上限，不是插件能突破的上限；如果豆包后续换了模型，需要相应调整。

## 许可证

MIT License
