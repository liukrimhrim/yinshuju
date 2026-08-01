# 印书局技术栈规范 v1

定案于「技术栈与部署」票（2026-07-31）。原则：引擎与框架解耦、最少运行时依赖、重活懒加载。

## 定案

- **UI：Svelte 5 + Vite + TypeScript**。参数面板（七色盘/行格/字体/纹理滑杆）与实时预览用响应式状态；预览=引擎输出的 SVG 字符串挂载。
- **引擎：纯函数 TS，零框架依赖**——`src/engine/`：`parse.ts`（markup v1）、`layout.ts`（网格→坐标表）、`svg.ts`（坐标→SVG）、`themes.ts`（themes-v1 参数表）。原型 `proto/render-route` 的逻辑翻译成 TS 即引擎 v1。
- **部署：GitHub Pages + Actions 自动部署**（push main 即发；官方 pages workflow：build → upload-pages-artifact → deploy）。base path `/yinshuju/`，URL 默认 `liukrimhrim.github.io/yinshuju`。
- **运行时依赖（全部动态 import 懒加载）**：`pdf-lib`（导出 PDF 时）、`opencc-js`（开简繁转换时）、`opentype.js`（印章转 path / Safari 兜底时）。Svelte 本身零运行时。

## 字体管线

- **构建期切片**：`cn-font-split` 把 汇文明朝、朱雀仿宋、TW-Kai（兜底）切成 unicode-range woff2 切片自托管（`public/fonts/`，构建产物不进 git）；Noto Serif TC 仅作 UI/终极兜底走 Google Fonts。
- **大字体源文件不进 git**：`scripts/fetch-fonts.sh` 按 URL+校验和拉取到 `fonts-src/`（gitignored）。
- **导出字体嵌入定案（路线 b）**：收集文档用字命中的切片、以 data-URI 内嵌进导出 SVG（浏览器已缓存切片，取字节零额外流量）。若 Safari 实测 woff2-in-SVG-image 翻车 → 兜底 text→path（opentype.js + 整字体按需下载一次、Cache API 缓存）。
- 跨字体混排的度量微调与描边配平（vRain 技法，MVP 票已录）在 `svg.ts` 落地。

## 仓库结构

```
src/engine/        纯函数引擎（vitest 覆盖：夹注均分/溢出/坐标快照）
src/app/           Svelte UI（编辑器、参数面板、预览、阅读、导出）
scripts/           fetch-fonts / 切片管线
public/fonts/      切片产物（构建生成）
docs/              markup-v1 / themes-v1 / stack-v1 / 后续规格
.scratch/charter/  wayfinder tracker（只住 main）
proto/render-route 原型分支（throwaway，勿合并——含字体二进制）
```

## 质量闸

- `svelte-check`（含 tsc）+ `prettier` + `vitest`（引擎层小而准，不测 UI）。
- 一个 CI workflow：check + build，main 分支追加 deploy。
