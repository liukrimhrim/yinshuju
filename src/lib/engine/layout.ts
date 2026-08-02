import type {
  Block,
  CharSize,
  Run,
  GridParams,
  Meta,
  Page,
  PlacedChar,
} from './types';
import { latinSpan, segmentLatin } from './latin';

// 字号 → （占用半格数, 字号倍率）。恒守行格：小字两枚合一字位、大字独占两字位
const SIZE: Record<CharSize | 'body', { hSpan: number; scale: number }> = {
  small: { hSpan: 1, scale: 0.55 },
  body: { hSpan: 2, scale: 1 },
  large: { hSpan: 4, scale: 1.5 },
};

// 布局引擎：块 → 逐页网格坐标（col 右起 0，half 半格游标；大字占 2 半格）
// 几何换算（px）不在此层，见 svg.ts
export function layout(
  blocks: Block[],
  meta: Meta,
  grid: GridParams,
  titleScale = 1,
  authorScale = 0.85,
): Page[] {
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
  // 特殊列文字的实际占格（半格数）——拉丁成段后字符数≠占格数
  const cellsFor = (scale: number) => Math.max(2, Math.ceil(scale * 2));
  const spanOfText = (text: string, scale = 1) =>
    segmentLatin(text).reduce(
      (n, seg) =>
        !seg.s.trim()
          ? n + (seg.s === '\u3000' ? 2 : 1)
          : n + (seg.latin ? latinSpan(seg.s.length).hSpan : cellsFor(scale)),
      0,
    );

  // 按 run 排（篇题/题署行支持行内字号与拉丁成段）；不换列，截断保护
  const runSpan = (r: Run, baseScale: number) =>
    r.t === 'latin'
      ? latinSpan(r.s.length).hSpan
      : cellsFor(
          baseScale * SIZE[r.t === 'text' ? (r.size ?? 'body') : 'body'].scale,
        );
  const spanOfRuns = (runs: Run[], baseScale = 1) =>
    runs.reduce(
      (n, r) =>
        r.t === 'space'
          ? n + r.halves
          : r.t === 'text' || r.t === 'latin'
            ? n + runSpan(r, baseScale)
            : n,
      0,
    );
  const placeRuns = (
    runs: Run[],
    atCol: number,
    startHalf: number,
    role: PlacedChar['role'],
    baseScale = 1,
  ) => {
    let h = startHalf;
    for (const r of runs) {
      if (r.t === 'space') {
        h += r.halves;
        continue;
      }
      if (r.t !== 'text' && r.t !== 'latin') continue; // 题名列不排夹注/句读
      const hSpan = runSpan(r, baseScale);
      if (h + hSpan > HMAX) break;
      const upright = r.t === 'latin' && latinSpan(r.s.length).upright;
      cur.push({
        kind: r.t === 'latin' ? 'latin' : 'big',
        ch: r.s,
        col: atCol,
        half: h,
        hSpan,
        scale: baseScale * SIZE[r.size ?? 'body'].scale,
        role,
        ...(upright ? { upright: true } : {}),
      });
      h += hSpan;
    }
  };

  // 书名/著者/篇题等特殊列：同样按拉丁成段规则排（不换列，截断保护）
  const placeVert = (
    text: string,
    atCol: number,
    startHalf: number,
    role: PlacedChar['role'],
    scale = 1,
  ) => {
    let h = startHalf;
    for (const seg of segmentLatin(text)) {
      if (!seg.s.trim()) {
        h += seg.s === '\u3000' ? 2 : 1; // 空格留白
        continue;
      }
      const { hSpan, upright } = seg.latin
        ? latinSpan(seg.s.length)
        : { hSpan: cellsFor(scale), upright: false };
      if (h + hSpan > HMAX) break;
      cur.push({
        kind: seg.latin ? 'latin' : 'big',
        ch: seg.s,
        col: atCol,
        half: h,
        hSpan,
        scale,
        role,
        ...(upright ? { upright: true } : {}),
      });
      h += hSpan;
    }
  };

  // 卷首页：列0 书名顶格，列1 著者低格（距底留二格）
  placeVert(meta.title, 0, 0, 'title', titleScale);
  // 著者低格：末尾留两字位给印章，按实际占格倒推起点
  const authorHalf = Math.max(
    2,
    HMAX - 4 - spanOfText(meta.author, authorScale),
  );
  placeVert(meta.author, 1, authorHalf, 'author', authorScale);
  col = 2;

  for (const b of blocks) {
    freshCol();
    if (b.type === 'pagebreak') {
      // 本叶已有正文才换叶，避免连续分叶符产出空叶
      if (cur.some((c) => !c.role)) flushPage();
      continue;
    }
    if (b.type === 'blank') {
      advanceCol(); // 空一列
      continue;
    }
    if (b.type === 'author') {
      // 正文中的题署：自成一列，与卷端著者同样低格对齐（末留两字位）
      const start = Math.max(0, HMAX - 4 - spanOfRuns(b.runs, authorScale));
      placeRuns(b.runs, col, start, 'author', authorScale);
      advanceCol();
      continue;
    }
    if (b.type === 'chapter') {
      curChapters.push(b.text);
      placeRuns(b.runs, col, 4, 'chapter'); // 低二格
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
        const { hSpan, upright } = latinSpan(r.s.length);
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
      } else if (r.t === 'space') {
        half += r.halves;
        if (half >= HMAX) advanceCol();
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
