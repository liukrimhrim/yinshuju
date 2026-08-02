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
    if (c === ' ' || c === '\u3000' || c === '\t') {
      runs.push({ t: 'space', halves: c === '\u3000' ? 2 : 1 });
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

export function parse(src: string): Block[] {
  const trimmed = src.replace(/^\n+|\n+$/g, '');
  if (!trimmed.trim()) return [];
  const blocks: Block[] = [];
  let paraLines: string[] = [];
  let blankRun = 0;
  // 段首留白指令：[2]＝天地各留 2 字位；[2,0]＝只留天头；[0,3]＝只留地脚
  const INDENT_RE = /^\[(\d+(?:\.\d+)?)(?:\s*[,，]\s*(\d+(?:\.\d+)?))?\]\s*/;
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
    // 连续空行：第一个只作分段（提行），其余每个空一列
    for (let i = 1; i < blankRun; i++) blocks.push({ type: 'blank' });
    blankRun = 0;
    if (/^-{3,}$/.test(line.trim())) {
      flush();
      blocks.push({ type: 'pagebreak' }); // 分叶符：其后文字另起一叶
      continue;
    }
    if (line.trim().startsWith('>')) {
      flush();
      const runs = parsePara(line.trim().replace(/^>+\s*/, ''));
      blocks.push({ type: 'author', text: plainOf(runs), runs });
      continue;
    }
    if (line.trim().startsWith('#')) {
      flush();
      const runs = parsePara(line.trim().replace(/^#+\s*/, ''));
      blocks.push({ type: 'chapter', text: plainOf(runs), runs });
    } else {
      paraLines.push(line);
    }
  }
  flush();
  for (let i = 1; i < blankRun; i++) blocks.push({ type: 'blank' }); // 末尾空行亦生效
  return blocks;
}
