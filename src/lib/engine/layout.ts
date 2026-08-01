import type { Block, GridParams, Meta, Page, PlacedChar } from './types';

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
        if (half % 2) half++;
        if (half >= HMAX) advanceCol();
        const o: PlacedChar = { kind: 'big', ch: r.s, col, half };
        cur.push(o);
        lastBig = o;
        half += 2;
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
