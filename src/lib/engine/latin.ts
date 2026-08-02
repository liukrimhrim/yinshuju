// 拉丁/数字的成段规则——正文、书名著者列、版心三处共用
// （竖排通行做法：短段縦中横直立压入一字位，长段转 90° 沿列横排）

const LATIN_RUN = /^[A-Za-z0-9]+(?:[.\-/:'’ ]?[A-Za-z0-9]+)*/;

export interface Segment {
  s: string;
  latin: boolean;
}

/** 把一串文字切成「单个汉字」与「连续拉丁段」 */
export function segmentLatin(text: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const m = /^[A-Za-z0-9]/.test(rest) ? LATIN_RUN.exec(rest) : null;
    if (m) {
      out.push({ s: m[0], latin: true });
      i += m[0].length;
    } else {
      out.push({ s: text[i]!, latin: false });
      i += 1;
    }
  }
  return out;
}

// 比例衬线的字符宽度估值（em）——按此定长，避免用 textLength 拉伸字距
const WIDTH_EM: Record<string, number> = {
  ' ': 0.25,
  '.': 0.27,
  ',': 0.27,
  ':': 0.27,
  '-': 0.33,
  '/': 0.28,
  "'": 0.22,
  '’': 0.22,
};
const widthOfChar = (c: string) => {
  const w = WIDTH_EM[c];
  if (w !== undefined) return w;
  if (/[0-9]/.test(c)) return 0.5;
  if (/[A-Z]/.test(c)) return 0.68;
  if (/[ijltfr]/.test(c)) return 0.32;
  if (/[mw]/.test(c)) return 0.78;
  return 0.5; // 其余小写
};

/** 拉丁段的自然宽度（em，相对其自身字号） */
export const latinWidthEm = (s: string) =>
  [...s].reduce((n, c) => n + widthOfChar(c), 0);

// 纵向一半格 ≈ 字号 / (2×纵向字面率)；以名义 0.8 折算，渲染端再以 textLength 只压不拉
const HALVES_PER_EM = 1.6;

/** 拉丁段占格：≤3 字符縦中横压入一字位（无余量，中西间距最紧）；更长转横排 */
export function latinSpan(s: string): { hSpan: number; upright: boolean } {
  if ([...s].length <= 3) return { hSpan: 2, upright: true };
  return {
    hSpan: Math.max(2, Math.round(latinWidthEm(s) * HALVES_PER_EM)),
    upright: false,
  };
}
