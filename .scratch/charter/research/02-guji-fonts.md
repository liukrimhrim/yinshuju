# 02 · 古籍气质中文字体调研（web 版线装书排版器）

调研日期：2026-07-31。授权结论均给出证据链接；抓不到一手来源的一律标「未能核实」。印章篆书不在本票范围。

## TL;DR 推荐组合

- **正文（宋体刻本味）：汇文明朝体** —— 免费商用（作者声明），铅印/刻本气质是免费字体里最浓的，繁体常用字够用。
- **夹注/批注（楷体写本味）：全字库正楷体 TW-Kai** —— 政府开放授权/OFL 双授权可选，9.7 万繁体字是全场最强生僻字兜底。
- **标题：京华老宋体**（老宋标题味），或直接用汇文明朝体加大字号（省一个字体，推荐先这样）。
- **兜底栈：** `汇文明朝体 → TW-Kai/TW-Sung → Noto Serif TC`，主字体缺字时逐级回退，授权全干净。
- 一款通吃可行：只上汇文明朝体 + TW-Kai 兜底。

## 一、候选总表

| 字体                   | 授权（已核实）                                   | 气质                    | 繁体覆盖                 | 原始体积                        | 子集化                      |
| ---------------------- | ------------------------------------------------ | ----------------------- | ------------------------ | ------------------------------- | --------------------------- |
| 汇文明朝体             | 免费商用，作者声明（非标准协议）；修正版仓库 CC0 | 宋体铅印/刻本味 ★★★     | 台标字表全收，够用       | TTF 23.7MB                      | 可（见风险注）              |
| 京华老宋体             | 免费商用，作者声明；**禁止修改字体**             | 老宋（61-1 铅字）★★★    | 基本区+ExtA 全收         | 未能核实（36000+ 字级）         | 条款有冲突风险              |
| 全字库 TW-Kai/TW-Sung  | 台湾政府开放授权 v1 **或 OFL 1.1 二选一**        | 标准正楷/宋，平正无奇 ★ | 97,681 字，异体字之王    | 三文件合计数十 MB（未逐一核实） | 选 OFL 则完全自由           |
| 思源宋体/Noto Serif TC | OFL 1.1（LICENSE 铁证）                          | 现代书籍宋，古籍味弱 ★  | Big5+台标全够            | TC 区域包 138MB/7 字重          | 自由；Google Fonts 自动切片 |
| I.Ming 一点明朝体      | IPA Font License v1.0                            | 传承字形明朝体 ★★       | 常用繁体够（字数未核实） | TTF 25.9MB                      | 协议对衍生再分发有义务      |
| 朱雀仿宋               | OFL 1.1                                          | 仿宋活字雅致 ★★         | 开发中（v0.2x 预发布）   | 未能核实                        | 自由                        |
| 国文正楷 Kai Oldstyle  | **商业零售字体，无公开授权页**                   | 楷体老派 ★★★            | 未能核实                 | 未能核实                        | 不可用（未购授权）          |
| 康熙字典体             | **版权已卖断，不可自由商用**                     | 康熙木刻 ★★★            | 47,037 字                | —                               | 排除                        |
| 上图东观体             | 版权归上海图书馆，措辞偏「非盈利目的」           | 宋刻本味 ★★★            | 9,169 字/字重，偏少      | ZIP 18.8MB（3 字重）            | 商用不荐                    |
| 天珩全字库             | **字形取自中易/华康/方正等商业字库，授权不洁**   | —                       | 超大                     | —                               | 排除                        |

## 二、逐款笔记与证据

### 1. 汇文明朝体（Huiwen-mincho）

- 作者特里王，2021-01 知乎首发（[【發佈】匯文明朝體](https://zhuanlan.zhihu.com/p/344103391)，知乎正文未能直接抓取）；字形复刻 1950–60 年代铅印书籍，繁体部分承民国至建国初印刷旧风——不是逐字扫描古籍，但铅印刻本气质公认最浓。
- 2025 年作者经猫啃网正式发布**汇文字体系列**：明朝体 GBK、**汇文仿宋、汇文正楷**、港黑，均标免费商用（[发布页](https://www.maoken.com/eyes/business/24549.html)）。汇文正楷可做夹注楷体候选，各单品页条款待逐一确认。
- 修正版仓库 [bosswnx/huiwenmincho-improved](https://github.com/bosswnx/huiwenmincho-improved) 带 LICENSE，标 **CC0-1.0**（README 亦述原作者知乎发布出处）；TTF 23.7MB（[仓库内文件页](https://github.com/bosswnx/huiwenmincho-improved/blob/main/%E5%8C%AF%E6%96%87%E6%98%8E%E6%9C%9D%E9%AB%94.ttf) 标注）。注意：修正版自标 CC0 的效力以原作者声明允许衍生为前提（第三方镜像 [ZeoSeven](https://fonts.zeoseven.com/items/256/) 记载其条款允许商用/嵌入/再分发/衍生）。
- 覆盖：GB2312 全收 + 台湾标准字符表全收 + 日文常用（ZeoSeven 页记载）——繁体常用字够，罕见异体字需兜底。

### 2. 京华老宋体（KingHwa_OldSong）

- 同为特里王作品，AI 辅助复刻北京新华字模厂 1961 年 61-1 老宋体。v3.0（2025-06-11）。
- 授权：作者声明免费商用，「可嵌入电子产品、软件应用之中」，但**非开源、不得修改字体本身**。声明原文出处：[知乎 p/637491623](https://zhuanlan.zhihu.com/p/637491623)、[微信文章](https://mp.weixin.qq.com/s/JWyx3mXpgsEacZ4ADTOd-Q)（两处均未能直接抓取，条款文字转录自[猫啃网收录页](https://www.maoken.com/freefonts/19417.html)）。
- 覆盖：Unicode 基本区+ExtA 全收，B–G 部分收，繁体相应收录，另收喃字常用字、已编码二简字（猫啃页记载，36,000+ 字）。文件体积未能核实。
- 风险注：子集化/切片在严格解读下属「修改字体文件」，与其禁改条款有张力（见第四节）。标题整字体量小，可整包加载规避。

### 3. 全字库正楷体 / 正宋体（TW-Kai / TW-Sung）

- 授权：官方数据集页明载可在「政府資料開放授權條款-第一版」**或「開源字型授權1.1版(OFL 1.1)」中二选一**（[data.gov.tw/dataset/5961](https://data.gov.tw/dataset/5961)；[授权条款页](https://data.gov.tw/licenses)；官网 [cns11643.gov.tw](https://www.cns11643.gov.tw)）。**选 OFL 即可自由子集、修改、自托管**。
- 覆盖：v98.1 繁体 97,681 字（含 TW-Kai / TW-Kai-Ext-B / TW-Kai-Plus 三文件；[猫啃网页](https://www.maoken.com/freefonts/1174.html)统计）——异体字/罕用字兜底全场最强。
- **勘误：全字库没有「隶书体」**。官方仅提供正宋、正楷两种（数据集页原文「全字庫字型提供正宋體及正楷體2種」）。官网另有《说文解字》篆体字型 ebas927.ttf（6,721 字，页面标「个人与系统发展使用」，授权偏窄——印章票若想用它需先核实此限制）。
- 气质：标准化楷书，平正规矩，写本味一般；胜在夹注小字清晰 + 覆盖无敌。

### 4. 思源宋体 / Noto Serif TC

- 授权铁证：[adobe-fonts/source-han-serif LICENSE.txt](https://raw.githubusercontent.com/adobe-fonts/source-han-serif/master/LICENSE.txt)（SIL OFL 1.1，Copyright 2017-2022 Adobe）；[googlefonts/noto-cjk Serif/LICENSE](https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/LICENSE)（OFL 1.1）。
- 体积（[GitHub Releases 2.003R 实测](https://api.github.com/repos/adobe-fonts/source-han-serif/releases/latest)）：TC 区域包 138MB（7 字重），TW 子集包 47MB；单字重全量约 20MB 级。
- 覆盖与工程性最稳（多字重、台标字形、Google Fonts 免费 CDN），但气质是现代书籍宋体——适合做 UI/兜底，不适合当「古籍味」主角。

### 5. 国文正楷 Kai Oldstyle（左佐工作室 zuotype）

- 确为左佐字库作品：[Behance 主页](https://www.behance.net/zuotype)列有项目「国文正楷-简繁 Kai Oldstyle」。
- **商业零售字体**：无公开授权页/价目，Behance 页无购买链接，联系方式仅 Instagram/微信；zuotype.com 域名不存在（DNS 无解析）。web 嵌入授权**未能核实**——未购买授权前本项目不可用。样张若用了它，正式版需换字或购买授权。
- 勿混淆：方正「汉文正楷」（郑午昌 1930 年代字稿，方正数字化商业发售）是另一款字体。

### 6. 康熙字典体——授权真相

- 厉向晨 2010 年据《康熙字典》木刻字制作，47,037 字。多年维权无果后**将著作权卖断给阿芙精油作其私用字体**（[同济知识产权中心文章](https://ipcenter.tongji.edu.cn/info/1013/1051.htm)、[中国台湾网 2013 年报道](http://culture.taiwan.cn/spot/201312/t20131213_5359352.htm)）。
- 猫啃网 2023-07-15 将「康熙字典体常用版」**移入存疑字体、不建议商用**（[公告页](https://www.maoken.com/zhengyi/17773.html)）。
- 结论：从无公开许可证文件，权利已私有化，**排除**。想要康熙木刻味，用汇文明朝体/京华老宋体替代。

### 7. 其他扫描

- **朱雀仿宋**（[TrionesType/zhuque](https://github.com/TrionesType/zhuque)）：README 明载「以 SIL Open Font License 1.1 发布」，可免费商用。仍在开发（Releases 最新 v0.212 预发布，2026-07），覆盖持续扩充中——气质极佳的仿宋，适合题签/引文，正文可用性待 1.0。
- **I.Ming 一点明朝体**（[ichitenfont/I.Ming](https://github.com/ichitenfont/I.Ming)）：基于 IPAmj 明朝增补，遵《傳承字形部件檢校表》旧字形；授权 **IPA Font License v1.0**（仓库内 LICENSE.md + 协议全文）。8.10 版 TTF 25.9MB（GitHub API 实测）。官方另有 [I.MingWebfont](https://github.com/ichitenfont/I.MingWebfont) 网页字型仓库。注意 IPA 协议对「衍生字体再分发」有改名、附源等义务，工程上比 OFL 麻烦；传承字形+置中标点（CP 版）对线装竖排是加分项，可作备选正文。
- **上图东观体**（[官方页](https://www.library.sh.cn/special/dongguanti/)）：汉仪×上海图书馆，取材馆藏宋刻本《东观余论》《长短经》等，刻本味极好；3 字重×9,169 字，ZIP 18.8MB。但官方措辞「版权归上海图书馆所有……希望全社会将其广泛应用于**非盈利目的**的各类场景」——授权含糊且偏非盈利，公开产品不荐，个人非盈利场景可用。
- **天珩全字库（TH-Tshyn）**：其下载页自述字形版权属「中易、华康、Iwata、Besta、方正」，属对商业字库的收集整理、仅限学习研究（官网 [cheonhyeong.com](http://cheonhyeong.com/Simplified/download.html) 抓取失败，声明转引自[知乎回答](https://www.zhihu.com/question/306887764/answer/3089356485)等转录）——**授权不洁，排除**。
- **文津明朝体 WenJinMincho**（[takushun-wu/WenJinMincho](https://github.com/takushun-wu/WenJinMincho)）：仓库自述「可免费商用的大字符集宋体字库，以 OFL 协议发布」，未深查字形基底，可作汇文缺字时的同风格备选线索。

## 三、CJK 大字体的 web 对策

三条路线，按场景选：

1. **静态预子集（pyftsubset/fonttools）**：构建期 `pyftsubset font.ttf --text-file=常用字表 --flavor=woff2`。适合**固定文案**（UI 标签、示例页）。一张常用 3500–5000 字表的 woff2 通常 1–3MB。
2. **unicode-range 切片（Google Fonts 式）**：把整字体切成 ~100+ 片小 woff2，CSS 里每片一个 `@font-face` + `unicode-range`，浏览器只下载页面用到的片。Google 用机器学习按共现规律分片（[Google 开发者博客](https://developers.googleblog.com/google-fonts-launches-korean-support/)、[web.dev](https://web.dev/articles/api-for-fast-beautiful-web-fonts)），实测可省 ~90% 传输。自托管工具：[cn-font-split](https://github.com/KonghaYao/cn-font-split)、font-range。适合**用户文本不可预知 + 想走纯静态托管**——印书局主方案。缓存友好：常用片一次下载全站复用。
3. **动态子集化（按用户文本现做）**：服务端/边缘函数对用户粘贴的文本跑 fonttools subset，只嵌用到的几百字，产物常 <200KB。适合「粘贴一篇文→排版→导出」的一次性场景，最省流量；代价是要有后端、每次现算。印书局若保持纯前端，可用 wasm 版 harfbuzz-subset 在浏览器内做同样的事。

- **授权对照**：OFL（思源/Noto/朱雀/全字库选 OFL）与政府开放授权明确允许子集与修改；**京华老宋体「禁止修改字体」条款与 2/3 路线冲突**——它只整包用于标题（体积换安全），或去信作者要一句子集化许可。汇文明朝体声明允许衍生（见上），风险低。

## 四、导出 PNG/PDF 的字体嵌入注意

- **Canvas 导 PNG**：绘制前必须 `await document.fonts.load('16px 字体名', 样例字)` 或 `document.fonts.ready`，否则画出回退字体；壁纸导出记得按 `devicePixelRatio`/目标分辨率放大画布。子集化字体只要包含所绘字符即可，PNG 本身不嵌字体、无授权问题。
- **程序化 PDF**：pdf-lib + @pdf-lib/fontkit 可嵌 TTF/OTF 并默认**子集嵌入**（subset: true）；jsPDF 只吃 TTF、不支持 CFF/OTF（思源宋体是 OTF/CFF，走 jsPDF 需先转 TTF，选库时注意；汇文/TW-Kai/I.Ming 均为 TTF 无此问题）。浏览器「打印为 PDF」会自动子集嵌入，成本最低。
- **OFL 的 Reserved Font Name**：自用子集渲染/嵌入 PDF 属正常使用；若产品提供「下载字体文件」功能即构成再分发，修改版须遵 RFN 改名义务。
- PDF 嵌入本质也是子集化——对京华老宋体同样适用第三节的条款风险提示。

## 五、未能核实清单（诚实账）

- 京华老宋体、朱雀仿宋、国文正楷的字体文件精确体积；I.Ming 精确字符数。
- 知乎/微信原始授权声明页均被反爬挡住，条款文字依赖猫啃网/ZeoSeven 转录（两站以逐字转录授权声明为业，可信度高，但非一手）。
- 汇文正楷、汇文仿宋的单品授权细则（系列发布页标免费商用，单品页未逐一抓取）。
- 天珩官网直连失败（ECONNREFUSED），排除结论基于多处一致的转录声明。

## 六、落地建议（供 charter 记账）

1. 主字体汇文明朝体：入库修正版 TTF（CC0 仓库），cn-font-split 切片自托管。
2. 夹注/兜底 TW-Kai + TW-Sung：官方渠道下载并留存「选择 OFL 1.1」的记录截图，切片自托管。
3. UI 与终极兜底 Noto Serif TC：直接走 Google Fonts CDN（或自托管切片）。
4. 标题若要京华老宋体：整包加载或预渲染成图，不切片；有余力去信特里王求子集化许可（他两款字体都是本项目气质最优解，值得一封信）。
