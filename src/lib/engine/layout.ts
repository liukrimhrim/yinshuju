import type {
  Block,
  CharSize,
  GridParams,
  Meta,
  Page,
  PlacedChar,
} from './types';

// 字号 → （占用半格数, 字号倍率）。恒守行格：小字两枚合一字位、大字独占两字位
const SIZE: Record<CharSize | 'body', { hSpan: number; scale: number }> = {
  small: { hSpan: 1, scale: 0.55 },
  body: { hSpan: 2, scale: 1 },
  large: { hSpan: 4, scale: 1.5 },
};

// 布局引擎：块 → 逐页网格坐标（col 右起 0，half 半格游标；大字占 2 半格）
// 几何换算（px）不在此层，见 svg.ts
export function layout(blocks: Block[], meta: Meta, grid: GridParams): Page[] {
  const HMAX = grid.charsPerCol * 2;
  const pages: Page[] = [];
  let cur: PlacedChar[] = [];
  let curChapters: string[] = [];
  let col = 0;
  let half = 0;
  let lastBig: PlacedChar | null = null;

  const flushPage = () => {
    pages.push({ chars: cur, folio: pages.length + 1, chapters: curChapters });
    cur = [];
    curChapters = [];
    col = 0;
    half = 0;
  };
  const advanceCol = () => {
    if (col + 1 >= grid.cols) flushPage();
    else {
      col++;
      half = 0;
    }
  };
  const freshCol = () => {
    if (half > 0) advanceCol();
  };
  const placeVert = (
    text: string,
    atCol: number,
    startHalf: number,
    role: PlacedChar['role'],
  ) => {
    let h = startHalf;
    for (const ch of text) {
      if (h + 2 > HMAX) break; // 特殊列不换列，截断保护
      cur.push({ kind: 'big', ch, col: atCol, half: h, role });
      h += 2;
    }
  };

  // 卷首页：列0 书名顶格，列1 著者低格（距底留二格）
  placeVert(meta.title, 0, 0, 'title');
  const authorRow = Math.max(1, grid.charsPerCol - [...meta.author].length - 2);
  placeVert(meta.author, 1, authorRow * 2, 'author');
  col = 2;

  for (const b of blocks) {
    freshCol();
    if (b.type === 'chapter') {
      curChapters.push(b.text);
      placeVert(b.text, col, 4, 'chapter'); // 低二格
      advanceCol();
      continue;
    }
    for (const r of b.runs) {
      if (r.t === 'text') {
        const { hSpan, scale } = SIZE[r.size ?? 'body'];
        if (hSpan > 1 && half % 2) half++; // 正文与大字须对齐字位
        if (half + hSpan > HMAX) advanceCol();
        const o: PlacedChar = {
          kind: 'big',
          ch: r.s,
          col,
          half,
          hSpan,
          scale,
          ...(r.mark ? { mark: r.mark } : {}),
        };
        cur.push(o);
        lastBig = o;
        half += hSpan;
      } else if (r.t === 'latin') {
        // ≤2 字符：縦中横（直立压入一字位）；更长：转 90° 横排，每字符约半格
        const upright = r.s.length <= 2;
        const hSpan = upright ? 2 : Math.max(2, r.s.length);
        const { scale } = SIZE[r.size ?? 'body'];
        if (half % 2) half++;
        if (half + hSpan > HMAX) advanceCol();
        const o: PlacedChar = {
          kind: 'latin',
          ch: r.s,
          col,
          half,
          hSpan,
          scale,
          ...(upright ? { upright: true } : {}),
        };
        cur.push(o);
        lastBig = o;
        half += hSpan;
        if (half % 2) half++; // 其后正文回字位
      } else if (r.t === 'punct') {
        if (lastBig) lastBig.punct = r.kind;
      } else {
        // 夹注：半字号双子列，右行先；偶数均分、奇数右行多一；跨列续排
        let i = 0;
        const L = r.chars.length;
        while (i < L) {
          if (half >= HMAX) advanceCol();
          const avail = HMAX - half;
          const k = Math.min(L - i, avail * 2);
          const rlen = Math.ceil(k / 2);
          for (let j = 0; j < k; j++) {
            const nc = r.chars[i + j]!;
            cur.push({
              kind: 'note',
              ch: nc.ch,
              col,
              half: half + (j < rlen ? j : j - rlen),
              sub: j < rlen ? 'R' : 'L',
              ...(nc.punct ? { punct: nc.punct } : {}),
            });
          }
          half += rlen;
          i += k;
        }
        if (half % 2) half++; // 注毕回单行大字：对齐下一整字位
      }
    }
  }
  flushPage();
  return pages;
}
