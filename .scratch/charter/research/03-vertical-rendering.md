# 03 · 浏览器竖排古籍版式与高保真导出：技术路线调研（2026-07）

## TL;DR 推荐

**单一 JS 布局引擎（纯网格坐标计算）→ SVG 渲染。阅读、翻页、导出全部吃同一份坐标数据。**
导出 PNG 走「SVG 序列化 → canvas 放大 → PNG」，字体以 data-URI 内嵌、Safari 兜底用字形转 path；
PDF v1 用 pdf-lib 逐页嵌 PNG（16×28cm = 453.54×793.70pt，尺寸精确、零浏览器依赖）。
不引入任何 DOM 截图库（html2canvas 一族全部排除，实证见下）。

核心理由：竖排古籍是**定宽定高的刚性网格**（每行 N 字、每半叶 M 行），分页是纯算术（`ceil(字数/(N*M))`），
不存在西文排版的断行/断页难题——浏览器排版引擎带来的好处趋近于零，带来的导出坑却是全部。

---

## 路线对比

### A. DOM + CSS `writing-mode: vertical-rl`

- **显示层支持已成熟**：`writing-mode` Baseline 2017-03 起全绿；`text-orientation` 2020-09 Baseline；
  `text-emphasis`（着重号）2022-03 Baseline，`text-emphasis-position: right/left` 可把小圈打在竖排字旁——
  这是句读圈点的原生手段（局限：圈打在字侧中央，非传统的字脚右下角；精确到角要 `::after` 绝对定位或放弃 DOM）。
- **双行夹注：CSS 无解，硬伤**。夹注即日文「割注 warichū」，W3C jlreq 明确确认 CSS 没有对应机制、无浏览器支持
  （w3c/jlreq#318）。`ruby` 是旁注（竖排时注文挂在正文右侧），语义和几何都不是夹注，凑不出来；
  社区 workaround 是 inline-table 拼装（slotDumpling/warichu），脆弱。
- **`ruby` 本职（旁注/注音）可用**：Chrome/Safari 支持好，Firefox 38+；`ruby-position: inter-character` 支持仍参差。
- **分页**：multicol 在 vertical-rl 下按逻辑轴工作（列变成水平堆叠带），方向语义绕、fragmentation 不可控；
  实用做法是定高容器让内容自然向左溢出、按页宽平移窗口。但既然网格是刚性的，**JS 直接切片比任何 CSS 分页都简单且精确**。
- **打印**：`@page { size: 16cm 28cm }` MDN 标 Baseline 2024-12，**实测是假的**——
  mdn/browser-compat-data#22946（2024-04 开，至今未解决）：Firefox 预览尺寸对但**保存出的 PDF 尺寸不对**；
  Safari 预览和保存都不对；只有 Chromium 真正落地（会锁死打印对话框纸张选择，能出精确尺寸矢量 PDF）。
  结论：浏览器打印 = Chrome-only 增强路径，不能当主导出。

**判定**：显示够用、导出全线是坑（见导出库实证），夹注还缺原生机制。不选作主渲染。

### B. SVG 排版（推荐）

- **布局自己算**：竖排本质是网格排字，每字一个坐标 `(col, row) → (x, y)`，版框/界行/鱼尾/象鼻全是几何图元。
  夹注 = 半字号双子列（自己的引擎里是三行代码的事）；句读小圈 = `<circle>` 想画哪画哪。CSS 做不到的这里全是自由的。
- **`<text>` per-char 定位 vs 依赖 SVG 的 `writing-mode`**：**必须选 per-char**。
  Safari 对 SVG 文本竖排的支持史一直烂：SVG 竖排 intrinsic sizing 迟至 Safari 26.4（2026）才修，
  foreignObject 的 vertical writing-mode/缩放 bug 2025-07 才对齐 Chromium/Firefox（webkit#295863）；
  而 per-char 定位（每字给 x/y，CJK 字形天然直立）是 SVG 1.1 时代就全浏览器一致的能力，绕开整个雷区。
- **标点竖排形是自排引擎的税**：不走 writing-mode 就没有免费的 OpenType `vert` 替换。
  方案：opentype.js 读 GSUB `vert` lookup 做替换，或维护 ~30 字的映射表（、。「」『』（）——…… → U+FE10-FE19 竖排形或 rotate+平移）。
  思源宋体（Source Han Serif）带完整 vert 特性。这是原型票要验证的第一件事。
- **导出天然精确**：serialize → `Image` → canvas（乘目标倍率）→ PNG。所见即所得，因为渲染源就是这份 SVG。
  服务端/WASM 备选 resvg 支持 vertical writing-mode 但有字符旋转 bug（linebender/resvg#890）——client 端够用就不碰它。
- **字体嵌入**：`<style>@font-face{src:url(data:font/woff2;base64,...)}</style>` 内嵌进 SVG（SVG 作 img 加载时不许外链资源）。
  Chrome/Firefox 稳；Safari 对「SVG-as-image 里的字体」历史劣迹多 → **兜底：导出副本把文字转 `<path>` 轮廓**
  （opentype.js `getPath()`，注意它不解 woff2，喂 ttf/otf），全浏览器像素级确定，连字体嵌入问题一起消灭。
- **阅读体验**：SVG 是 DOM——文字可选、可搜（`<text>` 可被 ⌘F 命中）、可加 aria、CSS 换主题。翻页 = 换渲染当前半叶的坐标切片。

### C. Canvas 手排

- fillText 逐字画，坐标逻辑与 B 完全相同；高清导出 = `ctx.scale(k,k)` 重画，简单。
- 但 Canvas2D 没有竖排概念（2008 年 W3C 就讨论过，至今没有；`direction` 只有 ltr/rtl，font 简写塞不进 font-feature-settings），
  标点竖排形同样要手工——**付了 B 的全部布局成本，却拿不到 B 的 DOM/可选文字/清晰缩放**。
- 屏显还要管 devicePixelRatio、缩放重绘。判定：Canvas 只配当 B 的栅格化后端，不配当渲染层。

---

## 导出手段逐一查证

| 手段                              | 竖排 CJK + webfont 实况                                                                                                                               | 判定                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| html2canvas                       | 自绘引擎**不支持 writing-mode**（#1258、#1942，常年 open）；1.4.1 停在 2022-01，作者自称实验品勿上生产                                                | **排除**                                    |
| html-to-image / dom-to-image-more | foreignObject 让浏览器自渲染，Chrome/FF 竖排原理上可行；但 Safari/iOS 空白图、字体丢失成灾（#461、#488、#199、#361）                                  | 不作为依赖                                  |
| satori                            | 官方 CSS 支持表**无 writing-mode**；明言不支持 OpenType 特性/RTL，不支持 WOFF2                                                                        | **排除**                                    |
| SnapDOM (@zumer/snapdom)          | 2025 起活跃、口碑替代 html2canvas；同为 foreignObject 系→竖排随浏览器走；issue 里无竖排专属恶性 bug，但有像素漂移类问题（#421）；自动内嵌 @font-face  | 若走 DOM 路线它是最优截图器；B 路线下不需要 |
| 原生 SVG foreignObject→canvas     | 自己造 html-to-image：字体必须 data-URI 内嵌（img 上下文禁外链）；同源/data URL 不污染 canvas；Safari foreignObject 老 bug 一箩筐（2025-07 才修一批） | 仅 DOM 备选                                 |
| SVG `<text>`→canvas（B 路线）     | per-char 定位全浏览器一致；字体内嵌 + Safari 转 path 兜底                                                                                             | **主路线**                                  |
| OffscreenCanvas + DPR             | 导出走显式目标像素（如 2160×3840），与 DPR 无关；OffscreenCanvas（Safari 16.4+）仅在 worker 批量出图时才值得用                                        | 按需                                        |

## PDF

- **浏览器 print-to-PDF**：`@page size` 精确尺寸实际 Chrome-only（BCD #22946：FF 保存尺寸错、Safari 全错）。
  可作「Chrome 用户矢量文本 PDF」增强项，不可作主路径。
- **pdf-lib**（推荐）：逐页 `embedPng` + `addPage([453.54, 793.70])`（16×28cm 换算 pt），尺寸绝对精确、全浏览器一致。
  v2 若要矢量文本：pdf-lib+fontkit 能嵌 TTF 并按坐标逐字 drawText——布局数据与 SVG 共用，竖排即逐字定位，可行但要自己管标点竖形与字体子集。
- **jsPDF**：PDF 的 CIDFont `/V` 竖排模式不暴露；`.html()` 对中文烂（#2465）；相比 pdf-lib 无优势。排除。
- **paged.js**：活着（NLnet 资助 2025 重写中），但它解决的是 CSS 分页 polyfill——我们的分页是算术，引入纯属负资产。排除。

---

## 推荐架构（驱动原型票）

```
文本 → 布局引擎(纯函数: 文字+版式参数 → 每半叶的字符坐标表)
        ├─ 阅读: 坐标表 → SVG(当前页±1) → 翻页=切片
        ├─ 壁纸: 同一 SVG → 内嵌字体/转path → canvas ×k → PNG
        └─ PDF : 逐页 PNG → pdf-lib 16×28cm  (增强: Chrome @page 打印矢量版)
```

**原型必须验证的风险（按杀伤力排序）**

1. Safari 的 SVG-as-image 字体渲染：data-URI woff2/ttf 是否稳定；不稳则导出统一走 text→path（顺带验证 opentype.js 中文字形正确性）。
2. 标点竖排形：思源宋体 `vert` GSUB 读取/映射表方案，覆盖 、。：；！？「」『』（）——…… 。
3. 中文字体体积：全量 5–20MB，需子集化（构建期 pyftsubset 按需切，或运行时对本文取 unicode 子集）。
4. 性能：每字一 `<text>` 节点，每半叶数百字——只渲染当前页 ±1 即可，长文（10 万字≈数百页）内存无压力，需实测翻页帧率。
5. pdf-lib 大 PNG 多页的内存峰值（100 页 × 4K 图）→ 分批生成或限制导出页范围。

**备选路线**：若原型发现 SVG 文本渲染在某浏览器有不可绕的字形问题 → 降级为「同一坐标表 + Canvas 渲染导出、DOM(vertical-rl) 只做阅读」的双头方案；代价是阅读/导出两套渲染可能有微小视觉差。DOM 截图库路线在任何情况下都不复活。

---

## 主要依据

- html2canvas writing-mode：github.com/niklasvh/html2canvas/issues/1258、/1942
- satori 不支持竖排：github.com/vercel/satori README（CSS 支持表；无 OpenType 特性、无 WOFF2）
- 夹注无 CSS 机制：github.com/w3c/jlreq/issues/318；W3C JLReq（warichū）
- @page size 真实兼容性：github.com/mdn/browser-compat-data/issues/22946（FF 保存尺寸错误、Safari 不支持，仅 Chromium 可用）
- Safari SVG 竖排修复时间线：webkit.org/blog/17862（Safari 26.4）；bugs.webkit.org #295863（foreignObject vertical，2025-07）
- html-to-image Safari 空白：github.com/bubkoo/html-to-image/issues/461、/488、/199、/361
- resvg 竖排字符旋转 bug：github.com/linebender/resvg/issues/890
- jsPDF 中文/竖排：github.com/parallax/jsPDF/issues/2465、/2151；PDF `/V` 模式不暴露（kamy.dev CJK-in-PDF 综述）
- text-emphasis / text-orientation / writing-mode Baseline：MDN（2022-03 / 2020-09 / 2017-03）
- SnapDOM：github.com/zumerlab/snapdom（2025 活跃；#421 像素漂移）
- paged.js 现状：nlnet.nl/project/PagedJS（2025 重写资助）
