// 领域类型（术语见 /domain.md）

export interface Meta {
  title: string; // 首行顶格：书名+卷次连排
  author: string; // 次行低格著者
  banxinTitle: string; // 版心简名
  banxinJuan: string; // 版心卷次
}

export type Run =
  | { t: 'text'; s: string; mark?: SideMark; size?: CharSize }
  | { t: 'latin'; s: string; size?: CharSize } // 连续拉丁/数字，整段排布
  | { t: 'note'; chars: NoteChar[] } // 双行小字夹注
  | { t: 'punct'; kind: PunctKind }; // 句读，附着于前一大字

// 旁线标记（markup v2，vRain 体系）：书名波浪线/着重圈注/点注/专名直线，画在字右侧
export type SideMark = 'book' | 'circle' | 'dot' | 'line';

// 单行字号（markup v2）：小字占半格、正文占一格、大字占两格——恒守行格
export type CharSize = 'small' | 'large';

export type PunctKind = 'ju' | 'dou'; // 句=○ 读=丶

export interface NoteChar {
  ch: string;
  punct?: PunctKind; // 注内句读，附着于本注字
}

export type Block =
  | { type: 'chapter'; text: string }
  | { type: 'para'; runs: Run[] }
  | { type: 'blank' }; // 额外空行 → 空一列

// —— 布局输出：纯网格坐标（几何换算归 svg 层） ——

export interface PlacedChar {
  kind: 'big' | 'note' | 'latin';
  ch: string;
  col: number; // 页内列序，0 = 最右
  half: number; // 半格游标（起点；一整字占 2 半格）
  hSpan?: number; // 占用半格数：小字 1 / 正文 2 / 大字 4；缺省按 kind 推定
  scale?: number; // 字号倍率（相对正文）；缺省 1
  upright?: boolean; // latin：縦中横（直立压缩入一字位）；否则转 90° 横排
  sub?: 'R' | 'L'; // 夹注子列，右先
  punct?: PunctKind; // 附着此字的句读
  mark?: SideMark; // 旁线标记（书名线等）
  role?: 'title' | 'author' | 'chapter'; // 特殊列文字；正文无 role
}

export interface Page {
  chars: PlacedChar[];
  folio: number; // 页码，从 1 起
  chapters: string[]; // 本页起始的篇题（PDF 书签数据源）
}

export interface GridParams {
  cols: number; // 半叶行数（竖排列数），域 [4,20] 常用 [8,15]
  charsPerCol: number; // 每列字数，域 [8,27] 常用 [16,22]
}
