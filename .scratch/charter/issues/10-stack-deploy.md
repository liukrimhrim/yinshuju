# 技术栈与部署

Type: grilling
Status: resolved
Blocked by: 08

## Question

定技术栈：框架（vanilla / Svelte / React？）、构建（Vite？）、部署（GitHub Pages？）、字体子集化怎么进构建流程、仓库结构。原则：ponytail，最少依赖，渲染路线（08 的定案）说了算。产出：定案 + 脚手架清单。

## Answer

用户拍板：**Svelte 5 + Vite + TypeScript**（引擎层仍是纯函数 TS 零框架依赖，Svelte 只管参数面板与预览挂载）；**GitHub Pages + Actions 自动部署**（push main 即发）。

我方定案（ponytail 默认，可推翻）：运行时依赖仅 pdf-lib / opencc-js / opentype.js 且全部懒加载；字体构建期 cn-font-split 切片自托管、源文件不进 git；**导出字体嵌入走"复用切片 data-URI 内嵌"路线**，Safari 翻车再切 text→path 兜底；质量闸 svelte-check + prettier + vitest（只测引擎）。

产出：[docs/stack-v1.md](../../../docs/stack-v1.md)（含仓库结构与字体管线细节）。
