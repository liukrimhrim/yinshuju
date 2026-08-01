# 竖排渲染与导出技术路线

Type: research

## Question

在浏览器里做竖排古籍版式并高保真导出，2026 年的最优路线是什么？对比三条：A. DOM + CSS `writing-mode: vertical-rl`（流式分页）；B. SVG 排版；C. Canvas 手排。每条评估：竖排排版能力（双行夹注、字旁圈点的定位可行性）、分页可行性、高分辨率 PNG 导出（html-to-image / satori / OffscreenCanvas / resvg-wasm 等各自对竖排 + webfont 的支持真相——竖排是这些库的重灾区，要查 issue 实证）、打印 PDF（`@page` 印刷 CSS 现状）。给出推荐与风险点，供「渲染路线样张验证」票使用。
