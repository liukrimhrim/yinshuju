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
src/lib/engine/      纯函数引擎（parse/layout/svg/themes + vitest）
src/lib/components/  Svelte UI 组件（编辑器、参数面板、预览）
src/lib/state.svelte.ts  应用状态（runes）
src/App.svelte       壳布局
scripts/             fetch-fonts / 切片管线
public/fonts/        切片产物（构建生成，不进 git）
docs/                markup-v1 / themes-v1 / stack-v1 / mvp-v1
.scratch/charter/    wayfinder tracker（只住 main）
proto/render-route   原型分支（throwaway，勿合并——含字体二进制）
```

（2026-07-31 实施记录：结构按 Svelte 惯例落在 `src/lib/` 下，本节已同步实际；字体切片用 fonttools 脚本实现「unicode-range woff2 自托管」，替代原定 cn-font-split——零新依赖、逐码位 range 偏冗长但走 gzip 无碍；css 内字体 URL 用相对路径，兼容任意部署 base。）

## 质量闸

- `svelte-check`（含 tsc）+ `prettier` + `vitest`（引擎层小而准，不测 UI）。
- 一个 CI workflow：check + build，main 分支追加 deploy。

## 本机字体库（2026-08-02）

内置字体只收**可再分发**的授权（CC0／OFL／政府开放授权／经许可原样分发）。授权只许个人使用、
不得对外提供字体文件的（如汉仪·新蒂系列），走**本机字体库**：

- 上传的 TTF/OTF 存本机 IndexedDB（`src/lib/fontstore.ts`），可存多款，刷新与重开浏览器都在，
  在字体下拉里与内置字体并列（前缀「本机：」），可逐项删除。
- 字体数据**不进仓库、不随站点分发**——只在这台设备的浏览器里；导出时 opentype.js 运行时子集化后
  内嵌进图片（11.7MB 源字体 → 194KB PNG 实测）。
- 渲染侧只认一个 family（`User Upload`），切换即换脸，故版式引擎与导出管线无需知道选的是哪一款。
