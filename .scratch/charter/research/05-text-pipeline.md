# 05 · 文本管线调研：简→繁转换 & 古文自动句读

调研日期：2026-07-31。所有链接与版本号当日核实。管线顺序结论先行：**先在简体上句读，再简→繁，最后叠旧字形层**（句读模型多为简体语料训练，见 b）。

## a) 简→繁转换

### 库选型：opencc-js，无悬念

- [nk2028/opencc-js](https://github.com/nk2028/opencc-js)：纯 JS，MIT AND Apache-2.0，348★。npm 最新 1.4.1，**2026-07-12 刚发版**（与 opencc-data 1.4.1 同步），是 OpenCC 各 JS port 中唯一活跃维护的。
- 体积：包 unpacked 6.0 MB（含全部词典，构建期打包、无运行时拉取）。全量引入打包后 2.23 MB / gzip 557 KB（bundlejs 实测）。**按需加载**：ESM tree-shaking，`opencc-js/core` + `ConverterFactory` 按 locale 引词典，只引 `cn→t` 估计可到 ~1 MB / gzip ~300 KB（估算未实测）；也可把词典 chunk 做 dynamic import 延迟加载。
- 支持自定义词典（`CustomConverter` / 向 ConverterFactory 追加词条），是下文治理手段的基础。
- 弃选：`opencc` npm 包是 Node 原生绑定（浏览器不可用）；各 wasm port 维护度低。

### 变体选择：s2t（OpenCC 标准繁体），直觉验证成立

- 三档区别（[OpenCC 官方](https://github.com/byvoid/opencc)）：`s2t` 转 OpenCC 标准繁体；`s2tw` 再按台湾教育部标准调字形（裏→裡、着→著）；`s2twp` 再加**现代惯用语替换**（内存→記憶體、鼠标→滑鼠）。
- **s2twp 对古籍场景确认有害**：惯用语词典按现代白话词组匹配，古文里同形序列会被误替换，且注入的是台湾当代词汇，与"古籍味"背道而驰。直觉正确。
- **s2tw 也不要**：台标是现代正字标准，恰好把古籍传统用字改掉（裡 替代 裏、著 吞并 着）。OpenCC 标准繁体 `t` 保留 裏、著/着分化等传统形体，最接近旧刻本用字。注意 [OpenCC #1001](https://github.com/BYVoid/OpenCC/issues/1001) 官方定位 `t` 为内部中间形式、建议现代内容用 s2tw——但那是现代 UI 语境；古籍排版反而 `t` 才对。
- 结论：`Converter({ from: 'cn', to: 't' })`，即 s2t。

### 一简对多繁：无权威错误率数字，靠"人在环内"治理

- 机制：OpenCC 靠词组词典（STPhrases，如 头发→頭髮）消歧，单字取默认值（发→發、后→後、里→裏）。词组词典是**现代白话词汇**，古文以单字行文、命中率天然下降：如「皇后」能救，但「后稷」「夏后氏」会错成 後。
- 高危字全集见维基百科[《简繁转换一对多列表》](https://zh.wikipedia.org/wiki/%E7%B9%81%E7%B0%A1%E8%BD%89%E6%8F%9B%E4%B8%80%E5%B0%8D%E5%A4%9A%E5%88%97%E8%A1%A8)（发/髮發、后/後、里/裏、干/乾幹、复/複復覆、系/係繫、几/幾、云/雲、余/餘、征/徵 等百余字，常错约 30 字）。
- 治理三板斧（排版器天然人在环内，成本低）：
  1. 内置 ~30 高危字清单，转换后**高亮所有命中字**，点击弹出候选繁体供改选；
  2. `CustomConverter` 叠加古文常用救护词条（后稷、夏后、何后 之类，随用户报错渐进积累）;
  3. 用户改选结果存 localStorage 作个人词典，同文档复现。

### 旧字形/异体字层：字体解决大头，小映射表补尾

- 旧字形差异分两类，方案不同：
  - **同码位字形差**（靑/青 部件、兪、辶 一点、户 形等大多数）：**选字体即免费解决**。传承字形字体：[I.Ming 一點明體](https://github.com/ichitenfont/I.Ming)（有 [Webfont 版](https://github.com/ichitenfont/I.MingWebfont)，IPA 开源字型授权）、[GuiWonder 尚古系列](https://github.com/GuiWonder/SourceHanToClassic)（思源衍生，OFL）。两项目均在维护。
  - **异码位**（為U+70BA→爲U+7232、眾→衆、真→眞、冊→册、裡→裏、即→卽）：字体救不了，需文本映射。**没有现成 npm 包**；权威数据源是 [ichitenfont/inheritedglyphs](https://github.com/ichitenfont/inheritedglyphs)《傳承字形推薦形體表》（含推荐形体+码位，文档仓库、复用其数据前需核授权条款）。从中手工整理 ~50 字 JSON 映射表接到 CustomConverter 上，半天工作量，作为可开关的「旧字形」选项（默认关，因旧码位在普通字体下可能缺字）。

## b) 古文自动句读

### 方案盘点（均已核实存活状态）

| 方案                                                                                                                                                            | 性质         | 质量/口碑                              | 费用/授权                                            | API                                            | 备注                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| [识典古籍](https://www.shidianguji.com/)（字节+北大）                                                                                                           | 在线整理平台 | 主流、口碑好                           | 阅读免登录免费；整理平台注册后免费用自动标点/OCR/NER | **无公开开发者 API**，网页内操作               | 活跃，最现实的"外部人工通道"                  |
| 吾与点（北大数字人文，wyd.kvlab.org）                                                                                                                           | 在线系统     | 论文称古文断句 94.9%                   | 曾免费注册                                           | 无公开 API                                     | **2026-07 实测域名已无法解析**，不可依赖      |
| 籍合网/古联"自动标点"（中华书局系）                                                                                                                             | 商业服务     | 宣称 >97%                              | 商业授权，面向机构                                   | 需商务接洽                                     | 静态站个人项目不适配                          |
| [ethanyt/guwen-punc](https://huggingface.co/ethanyt/guwen-punc)（GuwenBERT 系）                                                                                 | 开源模型     | 经典基线                               | Apache-2.0                                           | HF 无推理端点                                  | **简体输入**（殆知阁语料简化训练），标点+断句 |
| [raynardj/classical-chinese-punctuation-guwen-biaodian](https://huggingface.co/raynardj/classical-chinese-punctuation-guwen-biaodian)                           | 开源模型     | 下载量最高（871/月），20+ 种标点       | 卡片未标 license（用前需确认）                       | 页面明示"无任何推理商部署"→ **无免费托管 API** | 0.1B 参数，简体                               |
| [KoichiYasuoka/roberta-classical-chinese-base-sentence-segmentation](https://huggingface.co/KoichiYasuoka/roberta-classical-chinese-base-sentence-segmentation) | 开源模型     | 学术出品（UD-Kanbun 作者），B/E/S 断句 | Apache-2.0                                           | 无托管 API                                     | vocab 扩到**繁体可输入**；只断句不标标点      |
| SikuBERT（南农，四库繁体语料）                                                                                                                                  | 预训练基座   | 繁体古文基座里最正                     | Apache-2.0                                           | 无                                             | 只有基座，**无现成句读微调**可直接用          |

结论：**没有免费、稳定、可编程调用的托管 API**。HF serverless 推理对这些小众 token-classification 模型均未部署。

### 纯前端可行性：可行但重，只能做 opt-in

- 路线：transformers.js v3+（[官方文档](https://huggingface.co/docs/transformers.js/index)，ONNX Runtime，WebGPU/wasm 双后端）跑 BertForTokenClassification 属标准能力；上述模型无现成 ONNX，需用 optimum 自转一次（常规操作，一次性）。
- 体积账（0.1B 参数级）：fp32 ~400 MB 不可接受；**q8 ~110 MB、q4 ~60 MB（估算）**，一次性下载后 Cache Storage/OPFS 持久化。桌面端可用，移动端勉强。
- 选型：要"输入简体先句读"就用 guwen-punc（Apache-2.0 保险）；要直接吃繁体输入则 Yasuoka 断句模型（但无标点种类，只有句界）。

### 降级链设计建议（默认假设：纯前端静态站）

1. **默认（零成本）**：不自动句读。输入框约定用户自带标点，或提供「点击字间插入句读符」的手动圈点 UI——排版器本来就要支持句读符渲染，这层是复用。
2. **opt-in 增强 A（无下载）**：用户自带 LLM API key（Claude/DeepSeek/通义等，现代 LLM 句读质量已很好），前端直连；静态站零后端，key 存本地。
3. **opt-in 增强 B（离线党）**：transformers.js + q8 量化 guwen-punc，~110 MB 一次性下载，进度条+缓存。
4. **兜底外链**：引导到识典古籍整理平台处理后粘回（免费但纯手工往返）。
   建议实现顺序 1 → 2，3 视需求再上，4 只写进帮助文档。

## 总推荐

- **a)** opencc-js（cn→t，即 s2t）+ 高危字高亮人工改选 + CustomConverter 个人词典；旧字形 = 传承字形字体（I.Ming/尚古）打底 + inheritedglyphs 整理的 ~50 字异码位映射作可选开关。禁用 s2twp/s2tw。
- **b)** 首发不做自动句读（手动圈点 UI），第二步加"自带 LLM key"增强；本地模型（transformers.js + guwen-punc q8）作远期 opt-in；不依赖任何托管句读 API（现存者要么死、要么商业、要么无接口）。
