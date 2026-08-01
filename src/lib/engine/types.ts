// 领域类型（术语见 /domain.md）

export interface Meta {
  title: string; // 首行顶格：书名+卷次连排
  author: string; // 次行低格著者
  banxinTitle: string; // 版心简名
  banxinJuan: string; // 版心卷次
}

export type Run =
  | { t: 'text'; s: string }
  | { t: 'note'; chars: NoteChar[] } // 双行小字夹注
  | { t: 'punct'; kind: PunctKind }; // 句读，附着于前一大字

export type PunctKind = 'ju' | 'dou'; // 句=○ 读=丶

export interface NoteChar {
  ch: string;
  punct?: PunctKind; // 注内句读，附着于本注字
}

export type Block = { type: 'chapter'; text: string } | { type: 'para'; runs: Run[] };

// —— 布局输出：纯网格坐标（几何换算归 svg 层） ——

export interface PlacedChar {
  kind: 'big' | 'note';
  ch: string;
  col: number; // 页内列序，0 = 最右
  half: number; // 半格游标（一整字占 2 半格）
  sub?: 'R' | 'L'; // 夹注子列，右先
  punct?: PunctKind; // 附着此字的句读
  role?: 'title' | 'author' | 'chapter'; // 特殊列文字；正文无 role
}

export interface Page {
  chars: PlacedChar[];
  folio: number; // 页码，从 1 起
}

export interface GridParams {
  cols: number; // 半叶行数（竖排列数），域 [4,20] 常用 [8,15]
  charsPerCol: number; // 每列字数，域 [8,27] 常用 [16,22]
}
