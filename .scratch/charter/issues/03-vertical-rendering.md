# 竖排渲染与导出技术路线

Type: research
Status: resolved

## Question

在浏览器里做竖排古籍版式并高保真导出，2026 年的最优路线是什么？对比三条：A. DOM + CSS `writing-mode: vertical-rl`（流式分页）；B. SVG 排版；C. Canvas 手排。每条评估：竖排排版能力（双行夹注、字旁圈点的定位可行性）、分页可行性、高分辨率 PNG 导出（html-to-image / satori / OffscreenCanvas / resvg-wasm 等各自对竖排 + webfont 的支持真相——竖排是这些库的重灾区，要查 issue 实证）、打印 PDF（`@page` 印刷 CSS 现状）。给出推荐与风险点，供「渲染路线样张验证」票使用。

## Answer

详见 [研究文档](../research/03-vertical-rendering.md)。**推荐路线：自研 JS 布局引擎（刚性网格→逐字坐标表）→ SVG per-char 渲染**；阅读/翻页/导出共用同一份坐标数据。PNG 走 SVG→canvas 放大；PDF 用 pdf-lib 逐页嵌 PNG（16×28cm = 453.54×793.70pt，零浏览器依赖）。

关键实证（均查了 issue 一手来源）：

- **html2canvas 排除**：不支持 writing-mode（#1258/#1942 常年 open），2022 停更，作者自称勿上生产。
- **satori 排除**：官方 CSS 支持表无 writing-mode，无 OpenType 特性、不支持 WOFF2。
- **`@page size` 名不副实**：MDN 标 Baseline 2024-12，但实测（BCD #22946）仅 Chromium 出正确尺寸 PDF，Firefox/Safari 错 → 浏览器打印只能当 Chrome-only 增强，不能当主 PDF 出口。
- **双行夹注 CSS 无解**（w3c/jlreq#318 确认无 warichū 机制，ruby 是旁注不顶用）→ 自排引擎里是三行代码。这是 SVG 自排路线的决定性论据。
- **Safari 的 SVG writing-mode 劣迹**到 2025 年中才修 → SVG 必须 per-char 定位，不依赖 writing-mode，反而全浏览器一致。
- html-to-image 族在 Safari/iOS 空白图成灾；resvg 有竖排字符旋转 bug（#890）；jsPDF 中文烂；paged.js 对纯算术分页是负资产——全部不引入。

风险（转入样张验证票首验）：① Safari 渲染 SVG-as-image 内嵌字体不稳 → 兜底 text→path（opentype.js，喂 ttf）；② 自排失去 `vert` 特性，标点竖排形需 GSUB 读取或 ~30 字映射表；③ 字体必须子集化；④ 逐字节点性能靠只渲染当前页±1。

备选：同坐标表 + Canvas 导出、DOM vertical-rl 仅阅读的双头方案；DOM 截图库路线任何情况不复活。
