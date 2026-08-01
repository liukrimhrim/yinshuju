# 06 · 前端生成传统印章（藏书印）调研

结论先行：**字体用「全字库说文解字」（小篆，政府开放授权，可改作/子集化），缺字整印降级「全字库正楷体」；生成用 opentype.js 转路径 + SVG 组装（白文靠 mask 挖空），做旧用 feTurbulence+feDisplacementMap，叠纸用 mix-blend-mode: multiply。** 无需引入图片模板。

---

## 1. 篆书字体盘点（授权一手证据）

| 字体 | 风格 | 商用 | 改作/子集化 | 一手证据 |
|---|---|---|---|---|
| **全字库说文解字** | 说文小篆（大徐本），6721 字 | ✅ | ✅ | [官网字型下载页](https://www.cns11643.gov.tw/downloadList.jsp?ID=2&ID2=20&la=1)；条款为[政府資料開放授權條款第 1 版](https://data.gov.tw/license) |
| **崇羲篆体** | 小篆（依《说文》），王心怡×季旭昇，收字量大 | ✅ | ❌ 禁止改作 | [官网](https://xiaoxue.iis.sinica.edu.tw/chongxi/)授权页原文：采 CC-BY-ND-3.0-TW-or-later |
| **峄山碑篆体** | 秦刻石复刻小篆 | 声称✅ | 未知 | 仅[猫啃网转述](https://www.maoken.com/freefonts/21952.html)"作者声明授权"，**一手声明链接未核实** |
| 方正小篆体 | 小篆（张永明） | ❌ 需购买 | — | [方正官网产品页](https://www.foundertype.com/index.php/FontInfo/index/id/165)；方正免费商用仅黑体/书宋/仿宋/楷体四款 |
| 汉仪篆书繁 | 篆书 | ❌ 需购买 | — | [汉仪官网](https://www.hanyi.com.cn/productdetail.php?id=450)：仅个人非商用免费 |
| 汉鼎繁印篆 | 印篆/摹印篆味 | **未核实** | — | 90 年代旧字库，查无任何授权文本，按不可商用处理 |

要点：

- 政府資料開放授權條款第 1 版明确允许商业利用与"改作"，且与 CC-BY 4.0 相容（[条款原文](https://data.gov.tw/license)）；义务是显名标示来源（须注明"全字库/CNS11643"）。**这意味着说文解字体可以子集化、抽 glyph 转 SVG path、随产品分发**——这是它压过崇羲的决定性一点。
- 崇羲篆体"禁止改作"：不能子集化、不能改造后再分发；只能整包原样引用。作候补，不作主力。
- **缪篆/摹印篆（汉印风格）没有找到任何开源实现**。印篆类字体（汉鼎繁印篆、金梅印篆等）均商业或来源不明。想要"汉印味"暂无合规免费路径，先用小篆（本就是印章正统用篆）。
- 全字库另有正宋/正楷字型，[data.gov.tw 数据集 5961](https://data.gov.tw/dataset/5961) 标示可择一适用开放条款或 OFL 1.1——楷体降级字体同源同授权，法务上一套条款走完。

## 2. 现成生成器先例

| 项目 | 许可 | 实现 | 可借用点 |
|---|---|---|---|
| [vYinn](https://github.com/shanleiguang/vYinn)（中文古籍印章制作工具） | MIT | Perl + ImageMagick，输出透明 PNG | **功能范式最对口**：阴文/阳文、圆/方/椭圆印框、"做残、油墨、扩散"效果、按字体属性自动修正字距。Perl 不能进前端，但参数设计照抄 |
| [DrawStampUtils](https://github.com/xxss0903/drawstamputils)（1.6k★） | Apache-2.0 | TypeScript + Canvas，导出 PNG/SVG | 前端做旧的现成参考：毛边 IRoughEdge、做旧 IAgingEffectParams 参数化。但面向现代公章（圆/椭圆+五角星），无方形藏书印、无篆书排印 |
| [SealUtil](https://github.com/localhost02/SealUtil)、[pansyjs/seal](https://github.com/pansyjs/seal)、my_seal 等 | 各异 | Java Graphics2D / Canvas | 均现代公章向，参考价值低 |

结论：**没有"前端 SVG 藏书印"的现成轮子**，但 vYinn（功能清单）+ DrawStampUtils（前端做旧参数）拼起来就是方案，两者许可（MIT/Apache-2.0）都允许借鉴移植。自研量不大。

## 3. SVG 实现技法

**朱文（阳刻，红字+红框、透底）**

```svg
<rect fill="none" stroke="#9e2a22" stroke-width="…" rx="…"/>
<path fill="#9e2a22" d="…字形路径…"/>
```

**白文（阴刻，红底挖空字）**——用 mask 真挖空，别画白字（白字会遮住纸纹）：

```svg
<mask id="bw"><rect fill="#fff" …/><path fill="#000" d="…字形…"/></mask>
<rect fill="#9e2a22" mask="url(#bw)" …/>
```

**边缘做旧（残缺斑驳）**——纯 SVG filter，无需预制蒙版图：

- 扭边：`feTurbulence`（fractalNoise，baseFrequency≈0.05–0.15，**seed 固定保证可复现**）→ `feDisplacementMap`（scale 2–8）。参考 [Codrops feTurbulence 纹理](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)、[rough borders 一文](https://bengammon.co.uk/rough-css-borders-with-svg-filters/)。
- 斑驳掉色：第二路 turbulence 经 `feColorMatrix` 阈值化成噪点 alpha，`feComposite operator="out"` 在印面上打微孔。
- 预制蒙版图仅在追求美术级质感时再考虑，不是首选。

**印泥质感**：印面用径向渐变（中心饱和、边缘偏淡）+ 上述噪声调制透明度；整个印章图层 `mix-blend-mode: multiply` 叠在纸面上——红色像"钤"上去而非"贴"上去，最便宜有效的一招。

**字体→图形**：用 opentype.js 把输入字转成 path 再进 SVG，而非 `<text>`+webfont：挖空、描边、导出 PNG/PDF 都不再依赖字体加载时序；`font.charToGlyph()` 命中 `.notdef` 即检出缺字。字体文件仅在用户启用印章功能时懒加载（TTF 体积数 MB 级，具体以实测为准；说文体授权允许构建期预子集化常用字进一步瘦身）。

## 4. 缺字降级：楷体入印有据

篆书是印章主流，但非篆入印史有明证：宋官印已有楷书实例（如"洲南渡税场记"），元押印通行楷书，明清藏书印中隶、楷入印不罕见（[澎湃·古代印章里的隶书楷书](https://www.thepaper.cn/newsDetail_forward_7931182)、[维基·藏书印](https://zh.wikipedia.org/wiki/%E8%97%8F%E4%B9%A6%E5%8D%B0)）。

实操规则：**任一字缺篆即整印退回楷体**（全字库正楷体），不在单印内篆楷混排（不合印制且难看）。降级链：说文小篆（6721 字）→ 整印楷体。可在 UI 上提示"含篆书未收字，已以楷书入印"。

## 5. 推荐路线（供功能票直接开工）

1. 字体资产：全字库说文解字 TTF + 全字库正楷体 TTF，懒加载；关于页显名标示 CNS11643 来源。
2. 渲染管线：输入 2–6 字 → opentype.js 逐字取 path（缺字检测→整印切楷）→ 按方/圆/椭圆模板排布（方印 2×1、2×2、3×2 网格，从右往左竖排）→ 朱文/白文两种构图 → 做旧 filter（seed 由印文哈希得出，同印永远同貌）→ multiply 叠页。
3. 导出：SVG 原生嵌入版面；导出图片时 filter 由浏览器光栅化，无兼容障碍。
4. 暂不做：缪篆风格（无合规字体）、美术级预制残损蒙版（filter 版够用后再议）。
