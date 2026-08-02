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
import { parsePara } from './parse';

// 字号 → （占用半格数, 字号倍率）。恒守行格：小字两枚合一字位、大字独占两字位
export interface SizeScales {
  small: number; // *小字* 倍率
  large: number; // **大字** 倍率
}
export const DEFAULT_SIZES: SizeScales = { small: 0.7, large: 1.5 };

// 占格＝ceil(倍率×2) 半格：小字合占一字位、正文一字位、大字随倍率占两格以上
const scaleOf = (k: CharSize | 'body', s: SizeScales) =>
  k === 'small' ? s.small : k === 'large' ? s.large : 1;
// 占格随倍率走：≤0.74 两枚合一字位；0.75–1 独占一字位；
// >1 进位到整字位（偶数半格），大字始终不破行格
const spanOfScale = (scale: number) => {
  if (scale <= 0.74) return 1;
  if (scale <= 1) return 2;
  const halves = Math.ceil(scale * 2);
  return halves % 2 ? halves + 1 : halves;
};

// 布局引擎：块 → 逐页网格坐标（col 右起 0，half 半格游标；大字占 2 半格）
// 几何换算（px）不在此层，见 svg.ts
export interface Indent {
  top: number; // 天头留白（字位，可 0.5 步进）
  bottom: number; // 地脚留白
}

export function layout(
  blocks: Block[],
  meta: Meta,
  grid: GridParams,
  titleScale = 1,
  authorScale = 0.85,
  indent: Indent = { top: 0, bottom: 0 },
  sizes: SizeScales = DEFAULT_SIZES,
): Page[] {
  // 列内可排区间 [HMIN, HMAX)：留白由此扣除，全列（正文/题名/题署）一致
  const HTOTAL = grid.charsPerCol * 2;
  const rangeOf = (ind: Indent) => {
    const lo = Math.max(0, Math.round(ind.top * 2));
    return {
      lo,
      hi: Math.max(lo + 2, HTOTAL - Math.round(ind.bottom * 2)),
    };
  };
  const HMIN = rangeOf(indent).lo;
  const HMAX = rangeOf(indent).hi;
  // 当前生效区间（段落可用 [天,地] 覆盖）
  let hMin = HMIN;
  let hMax = HMAX;
  const pages: Page[] = [];
  let cur: PlacedChar[] = [];
  let curChapters: string[] = [];
  let col = 0;
  let half = HMIN;
  let lastBig: PlacedChar | null = null;

  const flushPage = () => {
    pages.push({ chars: cur, folio: pages.length + 1, chapters: curChapters });
    cur = [];
    curChapters = [];
    col = 0;
    half = hMin;
  };
  const advanceCol = () => {
    if (col + 1 >= grid.cols) flushPage();
    else {
      col++;
      half = hMin;
    }
  };
  const freshCol = () => {
    if (half > hMin) advanceCol();
  };
  // 特殊列文字的实际占格（半格数）——拉丁成段后字符数≠占格数
  const cellsFor = (scale: number) => Math.max(2, Math.ceil(scale * 2));
  // 按 run 排（篇题/题署行支持行内字号与拉丁成段）；不换列，截断保护
  const runSpan = (r: Run, baseScale: number) =>
    r.t === 'latin'
      ? latinSpan(r.s.length).hSpan
      : cellsFor(
          baseScale *
            scaleOf(r.t === 'text' ? (r.size ?? 'body') : 'body', sizes),
        );
  const spanOfRuns = (runs: Run[], baseScale = 1) =>
    runs.reduce((n, r) => {
      if (r.t === 'space') return n + r.halves;
      if (r.t === 'note') {
        const rlen = Math.ceil(r.chars.length / 2);
        return n + rlen + (rlen % 2); // 双行小字，注毕回字位
      }
      return r.t === 'text' || r.t === 'latin' ? n + runSpan(r, baseScale) : n;
    }, 0);
  const placeRuns = (
    runs: Run[],
    atCol: number,
    startHalf: number,
    role: PlacedChar['role'],
    baseScale = 1,
  ) => {
    let h = startHalf;
    let last: PlacedChar | null = null;
    for (const r of runs) {
      if (r.t === 'space') {
        h += r.halves;
        continue;
      }
      if (r.t === 'punct') {
        if (last) last.punct = r.kind; // 句读附着前字
        continue;
      }
      if (r.t === 'note') {
        // 夹注：与正文同法，双行小字（此列不换列，超出即截断）
        const avail = hMax - h;
        const k = Math.min(r.chars.length, Math.max(0, avail) * 2);
        const rlen = Math.ceil(k / 2);
        for (let j = 0; j < k; j++) {
          const nc = r.chars[j]!;
          cur.push({
            kind: 'note',
            ch: nc.ch,
            ...(nc.size ? { scale: scaleOf(nc.size, sizes) } : {}),
            col: atCol,
            half: h + (j < rlen ? j : j - rlen),
            hSpan: 1,
            sub: j < rlen ? 'R' : 'L',
            role,
            ...(nc.punct ? { punct: nc.punct } : {}),
          });
        }
        h += rlen;
        if (h % 2) h++; // 注毕回字位
        continue;
      }
      const hSpan = runSpan(r, baseScale);
      if (h + hSpan > hMax) break;
      const upright = r.t === 'latin' && latinSpan(r.s.length).upright;
      const placed: PlacedChar = {
        kind: r.t === 'latin' ? 'latin' : 'big',
        ch: r.s,
        col: atCol,
        half: h,
        hSpan,
        scale: baseScale * scaleOf(r.size ?? 'body', sizes),
        role,
        ...(upright ? { upright: true } : {}),
      };
      cur.push(placed);
      last = placed;
      h += hSpan;
    }
  };

  // 卷首页：列0 书名顶格，列1 著者低格（距底留二格）
  placeRuns(parsePara(meta.title), 0, HMIN, 'title', titleScale);
  // 著者低格：末尾留两字位给印章，按实际占格倒推起点
  const authorRuns = parsePara(meta.author);
  const authorHalf = Math.max(
    HMIN + 2,
    HMAX - 4 - spanOfRuns(authorRuns, authorScale),
  );
  placeRuns(authorRuns, 1, authorHalf, 'author', authorScale);
  col = 2;

  for (const b of blocks) {
    freshCol();
    // 段落可自带留白（[天,地]），其余块用全局值
    const nextRange = rangeOf(
      b.type === 'para' && b.indent ? b.indent : indent,
    );
    if (nextRange.lo !== hMin || nextRange.hi !== hMax) {
      hMin = nextRange.lo;
      hMax = nextRange.hi;
      half = hMin; // freshCol 已到列首，按新区间重置起点
    }
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
      const start = Math.max(hMin, hMax - 4 - spanOfRuns(b.runs, authorScale));
      placeRuns(b.runs, col, start, 'author', authorScale);
      advanceCol();
      continue;
    }
    if (b.type === 'chapter') {
      curChapters.push(b.text);
      placeRuns(b.runs, col, HMIN + 4, 'chapter'); // 低二格
      advanceCol();
      continue;
    }
    for (const r of b.runs) {
      if (r.t === 'text') {
        const scale = scaleOf(r.size ?? 'body', sizes);
        const hSpan = spanOfScale(scale);
        if (hSpan > 1 && half % 2) half++; // 正文与大字须对齐字位
        if (half + hSpan > hMax) advanceCol();
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
        const scale = scaleOf(r.size ?? 'body', sizes);
        if (half % 2) half++;
        if (half + hSpan > hMax) advanceCol();
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
        if (half >= hMax) advanceCol();
      } else if (r.t === 'punct') {
        if (lastBig) lastBig.punct = r.kind;
      } else {
        // 夹注：半字号双子列，右行先；偶数均分、奇数右行多一；跨列续排
        let i = 0;
        const L = r.chars.length;
        while (i < L) {
          if (half >= hMax) advanceCol();
          const avail = hMax - half;
          const k = Math.min(L - i, avail * 2);
          const rlen = Math.ceil(k / 2);
          for (let j = 0; j < k; j++) {
            const nc = r.chars[i + j]!;
            cur.push({
              kind: 'note',
              ch: nc.ch,
              ...(nc.size ? { scale: scaleOf(nc.size, sizes) } : {}),
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
