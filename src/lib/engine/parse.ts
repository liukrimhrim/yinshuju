import type { Block, NoteChar, PunctKind, Run } from './types';

const JU = '。！？';
const DOU = '，、；：';
// 其余标点静默丢弃（markup v1）：引号书名号括注框省略号破折号间隔号等
const DROP = new Set([...'「」『』《》〈〉【】〔〕“”‘’…—―–·']);

function punctKind(c: string): PunctKind | null {
  if (JU.includes(c)) return 'ju';
  if (DOU.includes(c)) return 'dou';
  return null;
}

function parseNote(s: string): NoteChar[] {
  const out: NoteChar[] = [];
  for (const c of s) {
    const k = punctKind(c);
    if (k) {
      const last = out[out.length - 1];
      if (last) last.punct = k; // 注内句读附着前一注字；开头孤标点丢弃
    } else if (!/\s/.test(c) && !DROP.has(c)) {
      out.push({ ch: c });
    }
  }
  return out;
}

export function parse(src: string): Block[] {
  const trimmed = src.trim();
  if (!trimmed) return [];
  return trimmed.split(/\n\s*\n/).map((raw): Block => {
    const b = raw.trim();
    if (b.startsWith('#')) return { type: 'chapter', text: b.replace(/^#+\s*/, '') };
    const runs: Run[] = [];
    let i = 0;
    while (i < b.length) {
      const c = b[i]!;
      if (c === '（' || c === '(') {
        const close = c === '（' ? '）' : ')';
        const j = b.indexOf(close, i + 1);
        const inner = b.slice(i + 1, j < 0 ? b.length : j);
        runs.push({ t: 'note', chars: parseNote(inner) });
        i = j < 0 ? b.length : j + 1;
        continue;
      }
      const k = punctKind(c);
      if (k) runs.push({ t: 'punct', kind: k });
      else if (!/\s/.test(c) && !DROP.has(c)) runs.push({ t: 'text', s: c });
      i++;
    }
    return { type: 'para', runs };
  });
}
