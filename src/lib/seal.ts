// 印章（mvp-v1 里程碑 C）：崇羲篆体 text→path，朱文/白文，做旧边缘
// 字体 CC-BY-ND（王心怡、季旭昇）：整包原样分发、不子集；渲染输出为图形，非字体改作。
import type { Font } from 'opentype.js';
import type { Palette } from './engine/themes';
import { esc, contentSeed } from './engine/svg';

export interface SealSpec {
  text: string;
  style: 'zhu' | 'bai'; // 朱文=红字红框（阳刻）/ 白文=红底白字（阴刻）
  shape: 'square' | 'circle' | 'ellipse';
  slot: 'authorBelow' | 'juanshou' | 'tiantou';
  kaiFallback: boolean; // 缺篆字时整印退用正文字体（不混排）
}

export const SEAL_SLOTS = [
  { id: 'authorBelow', label: '著者列下' },
  { id: 'juanshou', label: '卷首列脚' },
  { id: 'tiantou', label: '天头右上' },
] as const;

// —— 字体加载（懒，仅在有印章时触发；21.8MB 一次拉取后浏览器缓存） ——

let fontPromise: Promise<Font> | null = null;
export function loadSealFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = (async () => {
      const opentype = await import('opentype.js');
      const buf = await (
        await fetch('fonts/seal/chongxi_seal.otf')
      ).arrayBuffer();
      return opentype.parse(buf);
    })().catch((e) => {
      fontPromise = null; // 失败不缓存，允许重试
      throw e;
    });
  }
  return fontPromise;
}

export function missingChars(font: Font, text: string): string[] {
  return [...text].filter((ch) => font.charToGlyphIndex(ch) === 0);
}

// —— 纯布局：n 字 → 印面网格（右起竖排：右列先、上→下；奇数右列多一） ——

export interface SealCell {
  col: number; // 0 = 最右列
  row: number;
  cols: number;
  rows: number;
}

export function arrangeSeal(n: number): SealCell[] {
  if (n <= 0) return [];
  const rows = n <= 2 ? n : Math.ceil(n / 2);
  const cols = Math.ceil(n / rows);
  return Array.from({ length: n }, (_, i) => ({
    col: Math.floor(i / rows),
    row: i % rows,
    cols,
    rows,
  }));
}

// —— 单枚印面 SVG（原点在左上，返回宽高供摆位） ——

export interface SealArt {
  body: string;
  w: number;
  h: number;
  missing: string[];
}

export function buildSealSVG(
  spec: SealSpec,
  font: Font | null,
  size: number,
  palette: Palette,
  fallbackFamily: string,
): SealArt {
  const chars = [...spec.text].slice(0, 9);
  if (!chars.length) return { body: '', w: 0, h: 0, missing: [] };
  const w = size;
  const h = spec.shape === 'ellipse' ? size * 1.4 : size;
  const missing = font ? missingChars(font, chars.join('')) : [];
  const usePath = font !== null && (missing.length === 0 || !spec.kaiFallback);
  const seed = contentSeed(spec.text + spec.style + spec.shape);
  const fid = `se${seed}`;
  const red = palette.seal;
  const pad = size * 0.11;

  // 底/框
  let shapeEl: string;
  const strokeW = size * 0.07;
  if (spec.shape === 'square') {
    shapeEl =
      spec.style === 'bai'
        ? `<rect width="${w}" height="${h}" rx="${size * 0.06}" fill="${red}"/>`
        : `<rect x="${strokeW / 2}" y="${strokeW / 2}" width="${w - strokeW}" height="${h - strokeW}" rx="${size * 0.05}" fill="none" stroke="${red}" stroke-width="${strokeW}"/>`;
  } else {
    const rx = w / 2;
    const ry = h / 2;
    shapeEl =
      spec.style === 'bai'
        ? `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" fill="${red}"/>`
        : `<ellipse cx="${rx}" cy="${ry}" rx="${rx - strokeW / 2}" ry="${ry - strokeW / 2}" fill="none" stroke="${red}" stroke-width="${strokeW}"/>`;
  }

  // 印文
  const cells = arrangeSeal(chars.length);
  const { cols, rows } = cells[0]!;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const glyphFill = spec.style === 'bai' ? palette.paper : red;
  let glyphsEl = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const c = cells[i]!;
    const cx = pad + innerW - (c.col + 0.5) * cellW; // 右列先
    const cy = pad + (c.row + 0.5) * cellH;
    const fs = Math.min(cellW, cellH) * 0.92;
    if (usePath && font!.charToGlyphIndex(ch) !== 0) {
      const adv = font!.getAdvanceWidth(ch, fs);
      const path = font!.getPath(ch, cx - adv / 2, cy + fs * 0.34, fs);
      glyphsEl += `<path d="${path.toPathData(2)}" fill="${glyphFill}"/>`;
    } else if (usePath) {
      // 缺字且未退楷：占位空框，提示由 UI 承担
      glyphsEl += `<rect x="${cx - fs / 2.6}" y="${cy - fs / 2.6}" width="${fs / 1.3}" height="${fs / 1.3}" fill="none" stroke="${glyphFill}" stroke-width="2" stroke-dasharray="4 3"/>`;
    } else {
      // 整印退用正文字体（史据：宋楷官印、明清隶楷藏书印）
      glyphsEl += `<text x="${cx}" y="${cy}" font-size="${fs.toFixed(1)}" fill="${glyphFill}" font-family="${fallbackFamily}" text-anchor="middle" dominant-baseline="central">${esc(ch)}</text>`;
    }
  }

  // 边缘做旧：位移扭边 + 噪声蚀斑，seed=印文哈希（同印同貌）
  const body =
    `<g>` +
    `<defs><filter id="${fid}" x="-8%" y="-8%" width="116%" height="116%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="${seed}" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${(size * 0.045).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="${seed + 3}" result="p"/>` +
    `<feColorMatrix in="p" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.8 0.8 0.8 0 -1.05" result="pa"/>` +
    `<feComposite in="d" in2="pa" operator="out"/>` +
    `</filter></defs>` +
    `<g filter="url(#${fid})" opacity="0.92">${shapeEl}${glyphsEl}</g>` +
    `</g>`;
  return { body, w, h, missing };
}

// —— 摆位：印章集 → 页面叠加层（仅卷首叶） ——

export interface SealGeo {
  fx0: number;
  fy0: number;
  frameW: number;
  frameH: number;
  colW: number;
  tx1: number; // 正文区右缘
}

export function sealOverlaysFor(
  seals: SealSpec[],
  font: Font | null,
  geo: SealGeo,
  palette: Palette,
  fallbackFamily: string,
): { svg: string; missing: { index: number; chars: string[] }[] } {
  const size = geo.colW * 0.92;
  const slotBase: Record<SealSpec['slot'], { x: number; y: number }> = {
    authorBelow: {
      x: geo.tx1 - 2 * geo.colW + (geo.colW - size) / 2,
      y: geo.fy0 + geo.frameH * 0.8,
    },
    juanshou: {
      x: geo.tx1 - geo.colW + (geo.colW - size) / 2,
      y: geo.fy0 + geo.frameH * 0.86,
    },
    tiantou: {
      x: geo.tx1 - size * 1.05,
      y: geo.fy0 - size * 1.18,
    },
  };
  const stack: Record<string, number> = {};
  let svg = '';
  const missing: { index: number; chars: string[] }[] = [];
  seals.forEach((s, index) => {
    const art = buildSealSVG(s, font, size, palette, fallbackFamily);
    if (!art.body) return;
    if (art.missing.length) missing.push({ index, chars: art.missing });
    const base = slotBase[s.slot];
    const off = (stack[s.slot] ?? 0) * (art.h + size * 0.22);
    stack[s.slot] = (stack[s.slot] ?? 0) + 1;
    // 天头槽向上堆，框内槽向下堆
    const y = s.slot === 'tiantou' ? base.y - off : base.y + off;
    svg += `<g transform="translate(${base.x.toFixed(1)},${y.toFixed(1)})">${art.body}</g>`;
  });
  return { svg, missing };
}
