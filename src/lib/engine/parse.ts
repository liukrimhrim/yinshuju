import type {
  Block,
  CharSize,
  NoteChar,
  PunctKind,
  Run,
  SideMark,
} from './types';
import { segmentLatin } from './latin';

const JU = '。！？';
const DOU = '，、；：';
// markup v1：映射集之外的一切标点/符号静默丢弃（引号书名号省略号破折号、半角标点等）
const isDropped = (c: string) => /[\p{P}\p{S}]/u.test(c);

function punctKind(c: string): PunctKind | null {
  if (JU.includes(c)) return 'ju';
  if (DOU.includes(c)) return 'dou';
  return null;
}

function parseNote(s: string): NoteChar[] {
  const out: NoteChar[] = [];
  let size: CharSize | undefined;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '*') {
      const double = s[i + 1] === '*';
      const want: CharSize = double ? 'large' : 'small';
      size = size === want ? undefined : want;
      if (double) i++;
      continue;
    }
    const k = punctKind(c);
    if (k) {
      const last = out[out.length - 1];
      if (last) last.punct = k; // 注内句读附着前一注字；开头孤标点丢弃
    } else if (!/\s/.test(c) && !isDropped(c)) {
      out.push({ ch: c, ...(size ? { size } : {}) });
    }
  }
  return out;
}

// 旁线标记括对（markup v2）：全角专用，半角照旧丢弃
const MARK_OPEN: Record<string, SideMark> = {
  '《': 'book',
  '｛': 'circle',
  '＜': 'dot',
  '［': 'line',
};
const MARK_CLOSE = new Set(['》', '｝', '＞', '］']);

// 纯文本（去掉行内标记）——供 PDF 书签与版心篇题使用
const plainOf = (runs: Run[]) =>
  runs
    .map((r) =>
      r.t === 'text' || r.t === 'latin' ? r.s : r.t === 'space' ? ' ' : '',
    )
    .join('');

export function parsePara(b: string): Run[] {
  const runs: Run[] = [];
  let curMark: SideMark | null = null;
  let curSize: CharSize | null = null;
  let i = 0;
  while (i < b.length) {
    const c = b[i]!;
    // markdown 字号：**大字** / *小字*（成对开合，未闭合则吃到块尾）
    if (c === '*') {
      const isDouble = b[i + 1] === '*';
      const want: CharSize = isDouble ? 'large' : 'small';
      curSize = curSize === want ? null : want;
      i += isDouble ? 2 : 1;
      continue;
    }
    if (MARK_OPEN[c] && !curMark) {
      curMark = MARK_OPEN[c]!;
      i++;
      continue;
    }
    if (MARK_CLOSE.has(c)) {
      curMark = null;
      i++;
      continue;
    }
    // 【…】＝眉批：整段收进天头，不占正文字位（未闭合吃到块尾）
    if (c === '【') {
      const j = b.indexOf('】', i + 1);
      const inner = b.slice(i + 1, j < 0 ? b.length : j);
      const s = [...inner]
        .filter((x) => !/\s/.test(x) && !isDropped(x))
        .join('');
      if (s) runs.push({ t: 'margin', s });
      i = j < 0 ? b.length : j + 1;
      continue;
    }
    if (c === '（' || c === '(') {
      const close = c === '（' ? '）' : ')';
      const j = b.indexOf(close, i + 1);
      const inner = b.slice(i + 1, j < 0 ? b.length : j);
      runs.push({ t: 'note', chars: parseNote(inner) });
      i = j < 0 ? b.length : j + 1;
      continue;
    }
    // 连续拉丁字母/数字合成一段，整段排布（规则见 latin.ts）
    if (/[A-Za-z0-9]/.test(c)) {
      const seg = segmentLatin(b.slice(i))[0]!;
      runs.push({
        t: 'latin',
        s: seg.s,
        ...(curSize ? { size: curSize } : {}),
      });
      i += seg.s.length;
      continue;
    }
    // 空格留白：半角半字位、全角一字位（抬头、停顿等用）
    // 半角空格若紧邻拉丁段则吸收——中西间距由排版自动给出，不叠加手打空格
    if (c === ' ' || c === '\u3000' || c === '\t') {
      if (c === '\u3000') {
        runs.push({ t: 'space', halves: 2 });
      } else {
        const prevLatin = runs[runs.length - 1]?.t === 'latin';
        const nextLatin = /^[A-Za-z0-9]/.test(b.slice(i + 1));
        if (!prevLatin && !nextLatin) runs.push({ t: 'space', halves: 1 });
      }
      i++;
      continue;
    }
    const k = punctKind(c);
    if (k) runs.push({ t: 'punct', kind: k });
    else if (!/\s/.test(c) && !isDropped(c))
      runs.push({
        t: 'text',
        s: c,
        ...(curMark ? { mark: curMark } : {}),
        ...(curSize ? { size: curSize } : {}),
      });
    i++;
  }
  return runs;
}

// 留白指令：段首 [2]＝天地各留 2 字位、[2,0] 只留天头；篇题/题署行 [n]＝低几字位/距底几字位
const INDENT_RE = /^\[(\d+(?:\.\d+)?)(?:\s*[,，]\s*(\d+(?:\.\d+)?))?\]\s*/;

export function parse(src: string): Block[] {
  // 保留开头空行：卷端（书名/著者）与正文之间可借此空列
  const trimmed = src.replace(/\s+$/, '');
  if (!trimmed.trim()) return [];
  const blocks: Block[] = [];
  let paraLines: string[] = [];
  let blankRun = 0;

  const flush = () => {
    if (paraLines.length) {
      let body = paraLines.join('\n');
      let indent: { top: number; bottom: number } | undefined;
      const m = INDENT_RE.exec(body);
      if (m) {
        const top = Number(m[1]);
        indent = { top, bottom: m[2] === undefined ? top : Number(m[2]) };
        body = body.slice(m[0].length);
      }
      blocks.push({
        type: 'para',
        runs: parsePara(body),
        ...(indent ? { indent } : {}),
      });
      paraLines = [];
    }
  };
  for (const line of trimmed.split('\n')) {
    if (!line.trim()) {
      flush();
      blankRun++;
      continue;
    }
    // 连续空行：段间第一个只作分段（提行），其余每个空一列；
    // 文首空行无段可分，故每个都空一列
    const started = blocks.length > 0 || paraLines.length > 0;
    for (let i = started ? 1 : 0; i < blankRun; i++)
      blocks.push({ type: 'blank' });
    blankRun = 0;
    if (/^-{3,}$/.test(line.trim())) {
      flush();
      blocks.push({ type: 'pagebreak' }); // 分叶符：其后文字另起一叶
      continue;
    }
    if (line.trim().startsWith('>')) {
      flush();
      let body = line.trim().replace(/^>+\s*/, '');
      const m = INDENT_RE.exec(body);
      const offset = m ? Number(m[1]) : undefined;
      if (m) body = body.slice(m[0].length);
      const runs = parsePara(body);
      blocks.push({
        type: 'author',
        text: plainOf(runs),
        runs,
        ...(offset === undefined ? {} : { offset }),
      });
      continue;
    }
    if (line.trim().startsWith('#')) {
      flush();
      let body = line.trim().replace(/^#+\s*/, '');
      const m = INDENT_RE.exec(body);
      const offset = m ? Number(m[1]) : undefined;
      if (m) body = body.slice(m[0].length);
      const runs = parsePara(body);
      blocks.push({
        type: 'chapter',
        text: plainOf(runs),
        runs,
        ...(offset === undefined ? {} : { offset }),
      });
    } else {
      paraLines.push(line);
    }
  }
  flush();
  for (let i = 1; i < blankRun; i++) blocks.push({ type: 'blank' }); // 末尾空行亦生效
  return blocks;
}
