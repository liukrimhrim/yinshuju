# 先行项目与可借力库

Type: research
Status: resolved

## Question

已有哪些做过"古籍排版 / 中文竖排渲染"的项目和库，我们能借力什么？扫描：GitHub 上的古籍排版与竖排项目（如龙泉大藏经排版实践、"汉字标准格式"类排版框架、vertical-writing 类库、各种"古籍风生成器"玩具）、设计圈同类商业品/小工具。每个给出：链接、活跃度、许可证、可直接复用还是只可参考。结论：站在谁的肩膀上、哪些轮子不必造。

## Answer

详见 [研究文档](../research/04-prior-art.md)。要点：

- **vRain**（shanleiguang/vRain，MIT，1.6k★，活跃）：Perl 出古籍刻本 PDF，界栏/鱼尾/夹批/背景全齐——栈不能用，但版式参数体系直接当需求规格书与保真度对标。
- **heti**（sivan/heti，6.7k★）：中文标点挤压、网格排版、古文预置样式，CSS/JS 可直接复用。
- **tategaki**（Denkiame/Tategaki，npm 活跃）：竖排 HTML 转换 + 标点挤压现成 JS。
- **nehan**（tategakibunko/nehan，MIT）：唯一现成 vertical-rl 分页引擎，翻页阅读候选；交互可参考 Bibi 与青空文庫 viewer 生态。
- **luatex-cn**（open-guji/luatex-cn，Apache-2.0）：夹注/侧批/眉批三层注文模型与网格竖排的权威参照。

结论：竖排渲染不必造轮子（CSS writing-mode 全绿）；龙泉寺方案无公开排版代码（只有 gj.cool 标点 API）；识典古籍/ctext 均横排+扫描图，不做文字层版式复刻；在线竖排生成器全是无鱼尾无版心的字符画。**「web 即时预览 × 刻本级版式保真 × 壁纸/翻页/打印 PDF 三出口」确认无人占据。** 最大技术风险不在渲染而在打印 PDF 的竖排分页（Firefox 有只打一页的历史 bug）——已按此在样张验证票加注。
