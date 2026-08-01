# 01 · 线装书半叶版式规范（驱动布局引擎用）

调研票：半叶（half-leaf）构成要素与制式比例。每条论断附来源；无法区分通例/个例处显式标注。
主要来源：[北京市古籍保护中心《古籍版式》](https://www.bjgujibaohu.com/ylyj/default/detail?id=103)、[北大古委会《古籍版式》](https://gwh.pku.edu.cn/info/1159/1203.htm)、[古书网《古籍版式》](https://gushu.net.cn/index.php/cms/show-94.html)、李绮莹[《宋、明、清书籍版心形式研究》](https://twfineartsarchive.ntmofa.gov.tw/QuarterlyFile/P0610400.pdf)（国立台湾美术馆季刊，下称「李文」，含宋 172 / 明嘉靖 259 / 明万历 217 / 清 282 部实物统计）。

雕版书以「版」（整叶，双半叶+版心）为单位刷印，对折后成两个半叶；明以后线装版心向外成书口，宋蝴蝶装版心向内（李文摘要）。布局引擎应以**整叶**为画布、半叶为镜像单元。

## 1. 术语表

| 术语 | 定义 | 来源 |
|---|---|---|
| 版框（边栏） | 围住版面文字的四周边线；上栏/下栏/左右栏 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103) |
| 四周单边 | 四周只印一道粗黑边线 | 同上 |
| 四周双边 | 四周粗黑线内侧再刻一细黑线 | 同上 |
| 左右双边 | 仅左右粗线内侧有细线，上下仍单线 | 同上 |
| 文武边栏 | 即「外粗（武）内细（文）」的双边形式的别称 | [搜狐·古籍版式常识](https://www.sohu.com/a/120724133_488447) |
| 界行/界格 | 版框内分割字行的直线；两线间条格为界格；红色印称朱丝栏、黑色称乌丝栏 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103)、[古书网](https://gushu.net.cn/index.php/cms/show-94.html) |
| 版心（叶心/中缝） | 两半叶之间无正文的一行，对折基准；宽度约合正文一行（李文§四） | [李文](https://twfineartsarchive.ntmofa.gov.tw/QuarterlyFile/P0610400.pdf) |
| 书口/版口 | 装订后开合一侧端面，即折叠后的版心外露处 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103) |
| 象鼻 | 鱼尾上下至版框之间的条状区域/黑线 | 同上 |
| 黑口/白口/花口 | 象鼻处刷墨成线为黑口（粗=大黑口，细=小黑口）；不着墨为白口；版心刻有文字为花口 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103)、[李文](https://twfineartsarchive.ntmofa.gov.tw/QuarterlyFile/P0610400.pdf) |
| 鱼尾 | 版心中鱼尾形符号，标示中缝线、作折叶基准；刻于距版心上边约 1/4 处 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103) |
| 单/双/三鱼尾 | 版心内鱼尾个数；双鱼尾又分「相随（顺鱼尾，同向）」与「相对（对鱼尾，尾尖相向）」（李文§四(一)） | [李文](https://twfineartsarchive.ntmofa.gov.tw/QuarterlyFile/P0610400.pdf) |
| 黑/白/花鱼尾 | 实心墨色/空心线描/带花饰的鱼尾 | 同上 |
| 天头 | 上栏以外的空白纸（又称书眉） | [北大古委会](https://gwh.pku.edu.cn/info/1159/1203.htm) |
| 地脚 | 下栏以外的空白纸 | 同上 |
| 书耳/耳题 | 版框外左上角小方格，内刻简化篇名（耳题/耳记）；多见于宋蝴蝶装，线装流行后渐消失 | [古书网](https://gushu.net.cn/index.php/cms/show-94.html) |
| 行款/行格 | 正文行数与每行字数，按半叶著录为「半叶 N 行 M 字」，注文著录「小字双行每行 X 字」 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103) |
| 牌记 | 类似版权页的刊记（书名、刻者、堂号、年代等），多在序目后或卷末 | [北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103) |

## 2. 版心内容排布（自上而下）

李文§四(二)(三)（实物统计支撑，可视为**通例**）：

1. **上象鼻（上鱼尾上方）**：镌本版大小**字数**（刻工计酬依据）；花口本或刻书名。
2. **上鱼尾下方～下鱼尾之间**：**简化书名、卷次、页码**。明嘉靖 259 部中 184 部页码见于鱼尾间——书名/卷次/页码出现在鱼尾间最频繁。
3. **下象鼻（下鱼尾下方）**：**刻工姓名**（或堂号）。清代因文字狱刻工署名骤减（李文§四(三)，时代差异注意）。
4. 单鱼尾本常在版心约 3/4 高处加一横细线，把版心划成三段（李文§五，宋至清共 89 部，属常见变体）。

佐证：「版心下方往往有刻字工人姓名和每版的字数」（宋刻本特征，[百度百科·宋刻本](https://baike.baidu.com/item/%E5%AE%8B%E5%88%BB%E6%9C%AC/8861412)）。

时代倾向（李文§五–七，供预设皮肤参考）：单黑鱼尾历代最普遍（宋 34%、嘉靖 57%、万历 71%、清 69%）；象鼻处宋代花口 38% 居首、嘉靖白口 49% 居首、万历花口 74%、清代花口 86%。「宋白口元黑口」之类断代口诀是鉴定经验谈，**非严格规律**。

## 3. 行格制度（半叶 N 行 × 行 M 字）

来源：[聚珍文化课《古籍的行格》](https://www.sohu.com/a/303078424_410481)。

- 总范围：半叶 4 行（行 8 字）至 20 行（行 25–27 字）；**8–15 行最常见**（通例）。
- 大字本：半叶 ≤10 行，行 ≤16 字（注文小字 ≤21 字）；小字本：≥10 行，行 ≥20 字（小字 ≥23 字）。
- 典型实例（个例，实測著录）：
  - 南宋建安**黄善夫本《史记》**：半叶 **10 行 18 字，注文小字双行行 23 字**；细黑口、左右双边、有界栏、书耳刻篇名（[搜狐·宋本史记](https://www.sohu.com/a/458131009_562249)）。
  - 清武英殿仿宋**相台岳氏本《五经》**：半叶 **8 行 17 字，小字双行同**（注字数=正文）；白口、四周双边、双鱼尾，版框 21×13.6 cm（[故宫博物院](https://www.dpm.org.cn/ancient/hall/161801.html)）。
  - 宋蜀大字本《史记集解》：半叶 9 行 16 字、小字 20 字；宋小字本《后汉书》：14 行 24–25 字、注 28–30 字（[聚珍](https://www.sohu.com/a/303078424_410481)）。

## 4. 比例关系（天头/地脚、版框长宽比）

- **天头 > 地脚**：中文书通例约 1.2–1.5 : 1；**木刻线装本常达 2:1 以上**（[许昌学院学报·版面设计资料](https://xuebao.xcu.edu.cn/info/1054/1396.htm)）。
- **版框宽:高 ≈ 0.65–0.75，均值约 0.7**（即高:宽≈10:7）。基于 440 部宋刻本半叶版框统计（《装饰》2020-06，[雅昌转载](https://m-news.artron.net/news/20240103/n1454727.html)）；结论：雕版规格以**比例**而非绝对尺寸为准。实例吻合：宋刻《国语》框 21.8×15.4（0.71），岳氏五经框 21×13.6（0.65）。
- 版框高/书叶高：宋刻《国语》开本高 45、框高 21.8（≈48%）；宋刻《春秋经传》书高 41.7、框高 21.3（≈51%）（[网易·古籍目录应与时俱进](https://www.163.com/dy/article/E4ELBFGB0521GV5Q.html)）。注意这些是未裁大开本**个例**；经多次修裁的常见传世线装书（开本高 24–28 cm）框高占比更高，约 60–75%（推断，未见系统统计）。
- 版心宽度 ≈ 正文一行之宽（李文§四）；鱼尾位于版心上 1/4 处（[北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103)）。

## 5. 双行小字夹注

- 形制：注文紧接正文，在**一个正文行（界格）宽度内并排两小行**，字号小于正文，以别于正文；即「割注/夹注/双行夹批」（[百度百科·双行夹批](https://baike.baidu.com/item/%E5%8F%8C%E8%A1%8C%E5%A4%B9%E6%89%B9/6540030)、[W3C clreq #109 讨论](https://lists.w3.org/Archives/Public/public-i18n-archive/2023OctDec/0333.html)）。古籍注疏「基本是双行夹注，单行夹注是现代排版才有」（[豆瓣讨论](https://www.douban.com/group/topic/104483117/)，经验谈）。
- 排法（同源的日文「割注」有成文规范，可移植）：小字**约正文半字号**；注文截为两半叠放于一行空间；**偶数字两行均分，奇数字第一行多一字**；过长则随正文换行（[Wikipedia·Warichū](https://en.wikipedia.org/wiki/Warich%C5%AB)，规则详见 [JLREQ §3.4 割注处理](https://www.w3.org/TR/jlreq/)）。
- 竖排中「第一行」为**右行**，先右后左读（竖排右起通例；中文来源多默认不言明，标为**通行惯例/推断**）。
- 注文结束后，正文从下一字位起**恢复单行大字**接排（同上惯例）。
- 字数：注文小字每行字数常多于正文（黄善夫本 18/23），也有「小字双行同」即与正文等字数（岳氏五经）——著录术语见[北保中心](https://www.bjgujibaohu.com/ylyj/default/detail?id=103)。

## 6. 句读圈点

- 符号：句（句末）用**小圈 ○/。**，读（句中停顿）用**点 、/丶**（[维基百科·句读](https://zh.wikipedia.org/wiki/%E5%8F%A5%E8%AE%80)）。
- 位置：圈点加在**字的右侧/右下角**（竖排右行习惯；[网易·古籍里的“点赞”](https://www.163.com/dy/article/G81HQA0T051485NJ.html)、[中国作家网·明代圈点法](https://www.chinawriter.com.cn/n1/2022/0310/c442005-32371180.html)）。
- 刻本附刻句读：北宋以后部分刻本已附圈点（[网易·古代标点](https://www.163.com/dy/article/FJE4UHGS0524COAD.html)）；岳氏《九经三传沿革例》七条目中专列「句读」，说明宋元经书刻本已把句读当作刊刻规范之一（[搜狐·沿革例影印记](https://www.sohu.com/a/787981548_121124384)）。**但多数刻本正文无句读，圈点常为读者朱笔手加**（塾师以朱笔断句，同上网易文）。
- 朱色惯例：明万历闵齐伋朱墨套印《春秋左传》凡例「**经传用墨，批评以朱**」；套印本中朱色用于行间圈点、短评，蓝色用于眉批校勘（[网易·闵凌套版](https://www.163.com/dy/article/F20FVQJJ0541AEHM.html)、[书报刊分会·闵凌套印本](http://www.sbksc.zcxn.com/html/xsydsbkzp/0410_1841.html)）。

## 7. 配色（清代/民国惯例）

- **墨印本**：常规刷印用墨（黑），是绝对主体。
- **朱印本/蓝印本**：版成后先以朱或蓝刷印少量作**校样/初印**（「初印朱本」「初印蓝本」，蓝印尤多，故校订底本称「蓝本」）；校定后方大量墨印（[简书·“蓝本”到底是何物](https://www.jianshu.com/p/984c9199d7a9)）。故蓝/朱印本=初印试印语义，非正式流通制式。
- **朱墨（多色）套印本**：正文墨、批点评注朱（及蓝、黄等，闵凌「五色套印」），见上节。
- **磁青纸**：明清内府以厚纸染磁青色作**书衣**（「库磁青皮」），亦用于写经（泥金/五色写经）（[简书](https://www.jianshu.com/p/984c9199d7a9)）。即：磁青=封面色，非版面色。

## 8. 给布局引擎的参数化建议

以整叶为画布（spread = 2×half + 版心列），所有长度按比例参数化，绝对尺寸只由 `pageHeight` 一个锚点换算（§4 的「以比例为准」结论）。

```js
page:      { heightCm: 28, halfWidthCm: 16 }          // 开本可配，默认约十六开线装
frame:     { wOverH: 0.70,                            // 版框宽:高，域 [0.65, 0.75]
             hOverPageH: 0.68,                        // 框高/叶高，域 [0.55, 0.75]（传世本常见；未裁大开本可低至 0.5）
             border: 'single'|'double'|'leftRightDouble',  // 四周单边/四周双边(文武)/左右双边
             outerW: 2.5, innerW: 0.8 }               // 相对单位：武线约 2–4× 文线
margins:   { topOverBottom: 2.0 }                     // 天头:地脚，域 [1.2, 2.5]；水平方向：订口侧余幅≥书口侧
grid:      { rows: 10, charsPerRow: 20,               // rows 域 [4,20] 常用 [8,15]；chars 域 [8,27] 常用 [16,22]
             showJiehang: true, lineColor: 'ink'|'vermilion' }  // 乌丝栏/朱丝栏
banxin:    { widthInColumns: 1,                       // 版心宽=1 个界格列宽
             mouth: 'white'|'blackThin'|'blackThick'|'flower',
             fishtail: { count: 1|2, style: 'black'|'white'|'flower',
                         pos: 0.25,                   // 上鱼尾顶距版心顶 1/4
                         pairing: 'aligned'|'opposed', // 顺/对（双尾时；单尾尖朝下）
                         extraRule: 0.75 },           // 可选：3/4 处横细线（单尾常见变体）
             slots: { above: 'charCount|none', middle: 'title+juan+folio', below: 'carver|studio|none' } }
annotation:{ lines: 2, scale: 0.5,                    // 双行小字，字号=正文 0.5（域 0.45–0.6）
             split: 'balanced-firstLineExtra',        // 偶数均分，奇数右行(第一行)+1
             order: 'rightFirst', resume: 'inline' }  // 注毕次字位回单行大字
punct:     { mark: '○'|'、', anchor: 'rightBottom',   // 字右下角，占字面外侧空隙，不占字位
             color: 'ink'|'vermilion' }               // 朱=手批/评点语义
palette:   { ink: '#1a1616', vermilion: '#c73e2e',    // 朱墨套印：正文 ink、批点 vermilion
             blueprint: '#2d4f8f',                    // 蓝印本整版代墨
             ciqing: '#1b2a56', paper: '#f3e9d2' }    // 磁青仅用于封面/函套
ear:       { enabled: false, pos: 'outerTopLeft', text: 'chapterTitle' }  // 书耳：仿蝴蝶装皮肤才开
```

预设皮肤建议：`song-bai`（白口单黑鱼尾左右双边、10 行 18 字）、`song-hei`（细黑口双对尾、仿黄善夫）、`dianben`（白口四周双边双尾、8 行 17 字、仿殿本岳氏五经）、`lanyin`（全版 blueprint 色）、`taoyin`（墨文+朱圈点）。
