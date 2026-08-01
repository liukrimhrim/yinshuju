# 印书局 · 规划地图

Label: wayfinder:map

## Destination

印书局（web 版线装古籍排版器）"动工前再无待决问题"的完整规格：渲染技术路线经真实样张验证定案、字体组合与授权核实定案、版式域模型（术语+几何规则）成文、输入标记语法定案、首发视觉主题定案、技术栈与部署定案、MVP 切分成文。到此为止是规划——实现是地图之外的下一段路。

已在开局钉死的框架决策（本地图的前提，非票据）：

- 产品形态 = **Web 应用**（浏览器渲染，GitHub Pages 级静态部署，后续可 PWA 化）
- 核心产出 = **三者都要**：高清壁纸/分享图导出、网页翻页阅读、打印 PDF
- 输入能力（最终态）= 纯正文自动排版 + 夹注标注 + 简繁转换 + 句读圈点
- 仓库 = `~/yinshuju`，产品名「印书局」

## Notes

- **领域**：中文线装古籍版式的 web 复刻。质量标准 = 用户给的四组样张（他的类比即质量线，产出向图看齐）：
  1. 止斋「鬼谷子定版」——素白底、蓝色正文、橙色白话小字夹注、朱印、版心书名卷次；
  2. 周嘉胄《香乘》卷十八/二十八——仿古纸纹理、黑字、双行小字剂量夹注、做旧粗边框、橙色印章群；
  3. 朱印本诗笺——通体朱墨、双行小字注、细边框、版心页码「十三」；
  4. 「御注道德经」——朱丝栏红框、句读圈点（字旁小圈）、双行夹注、楷体（Kai Oldstyle）。
- **常备 skills**：research（调研票）、prototype（样张验证票）、grilling + domain-modeling（决策票；版式术语表用 domain-modeling 维护进 `domain.md`）。
- **常设偏好**：ponytail——能用 CSS 不用 JS、最少依赖、最短能跑的 diff；**默认纯前端静态站**（无后端无账号），推翻此假设的票据必须明说；**字体/工具的授权必须核实一手来源**，不得凭记忆断言（用户第一性原则）。
- **tracker 机制**：research 票由后台 agent 调研并写 `research/<slug>.md`，**票据与本索引的落账只由主会话做**（避免并发写）。若读到某 research 票已有研究文档但未落账，以研究文档为准补账。

## Decisions so far

<!-- 每张已关闭票据一行：标题链接 + 一句话结论 -->

- [先行项目与可借力库](issues/04-prior-art.md) — 竖排渲染不必造轮子；可借力 vRain（版式参数对标）、heti、tategaki、nehan（分页）、luatex-cn（注文模型）；「web 即时预览×刻本保真×三出口」无人占据；最大风险是打印 PDF 竖排分页。
- [竖排渲染与导出技术路线](issues/03-vertical-rendering.md) — 推荐自研布局引擎（网格→逐字坐标表）+ SVG per-char 渲染，三出口共用坐标数据；PNG=SVG→canvas，PDF=pdf-lib 嵌页；html2canvas/satori/@page 均以 issue 实证排除；双行夹注 CSS 无解、自排三行代码是决定性论据。
- [简繁转换与自动句读](issues/05-text-pipeline.md) — opencc-js + s2t 变体（s2tw/s2twp 对古文有害）；句读无免费 API，降级链=手动圈点 UI 默认→用户自带 LLM key→本地模型远期；管线顺序：先句读→s2t→旧字形。
- [印章生成方案](issues/06-seal-generation.md) — 篆书用全字库说文解字字型（政府开放授权，可改作子集化）；SVG 自研（opentype.js 转 path，feTurbulence 做旧，seed=印文哈希）；缺字整印退楷不混排。
- [古籍版式规范与术语](issues/01-banshi-guifan.md) — 930+440 部实物统计打底：全比例参数化（框宽高比 0.7、天头:地脚 1.2–1.5:1、半叶 8–15 行×16–22 字）；双行夹注=半字号/右行先/注毕回单行（移植 JLREQ 割注规则）；句读不占字位；研究文档含引擎参数 schema 与 5 预设皮肤。
- [开源古籍字体与授权](issues/02-guji-fonts.md) — 正文汇文明朝体（CC0 修正版）+ 夹注全字库正楷 TW-Kai（OFL）+ 标题京华老宋体（整包，禁改条款与子集冲突）+ 兜底 Noto Serif TC；样张同款 Kai Oldstyle 与康熙字典体均排除（商业/授权不明）；子集化主方案 = cn-font-split 切片自托管。
- [渲染路线样张验证](issues/08-render-prototype.md) — 路线定案：自研布局引擎+SVG per-char，三出口共用坐标；夹注/圈点/半列版心/主题/纸墨纹理滤镜全部验证并活过导出；原型在 proto/render-route 分支；采下需求：颜色/字体可定制、纹理逼真（转 09/11）。
- [视觉主题定案](issues/09-visual-themes.md) — 首发四主题（默认朱丝栏）；字体按主题配默认（做旧=汇文、余=朱雀）；颜色七参数全开；做旧=纯 SVG 滤镜+强度滑杆+小字减档；规范落在 docs/themes-v1.md。
- [技术栈与部署](issues/10-stack-deploy.md) — Svelte 5 + Vite + TS（引擎纯函数零框架）；GitHub Pages + Actions 自动部署；依赖全懒加载；字体切片自托管、导出内嵌切片；规范落在 docs/stack-v1.md。
- [输入标记语法](issues/07-markup-syntax.md) — 零标记粘贴即可用：元数据走 UI 表单；圆括号=夹注；现代标点映射句读（可关）；空行=提行、#=篇题，仅此而已；规范+样例落在 docs/markup-v1.md，域模型种子 domain.md。

## Not yet specified

（清雾完毕：编辑器/阅读 UX、导出规格、句读点选、印章深度、PWA、后端与否、里程碑均已折入「MVP 切分与首发规格」票。）

- 实现级细节（翻页动画、性能调优、Safari 兜底实测、多页 PDF 演练）——属实现阶段，不在本地图

## Out of scope

- 实体书印刷/装订/售卖——样张原帖是实体商品，本效力只做数字渲染
- OCR（扫描件→文字）——输入只收现成文本
- 多人协作、账号体系
