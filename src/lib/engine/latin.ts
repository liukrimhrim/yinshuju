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

/** 拉丁段占格：≤2 字符縦中横占一字位；更长转横排，每字符约半格 */
export function latinSpan(len: number): { hSpan: number; upright: boolean } {
  return len <= 2
    ? { hSpan: 2, upright: true }
    : { hSpan: Math.max(2, len), upright: false };
}
