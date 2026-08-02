import type { Meta, Page, PlacedChar } from './types';
import type { Palette } from './themes';
import { BASE_PAGE_H, BASE_RATIO, frameDims } from './geometry';
import type { GridParams } from './types';

export interface RenderOptions {
  grid: GridParams;
  palette: Palette;
  frameWidth: number;
  texture: boolean;
  textureStrength: number; // 0–1，默认 0.6
  fontFamily: string;
  showPunct: boolean;
  pageW?: number; // 默认 16:28 基准开本
  pageH?: number;
  overlays?: string; // 叠加层（印章等），已定位的 SVG 片段
  banxinChapter?: string; // 可选：当前篇题入版心（vRain 章回机制）
}

const FISHTAIL_POS = 0.25;

const CN_DIGITS = '一二三四五六七八九';
export function toCnNum(n: number): string {
  if (n <= 0 || n > 99) return String(n);
  if (n < 10) return CN_DIGITS[n - 1]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (
    (tens > 1 ? CN_DIGITS[tens - 1]! : '') +
    '十' +
    (ones ? CN_DIGITS[ones - 1]! : '')
  );
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// djb2 内容哈希 → 滤镜 seed（同内容同貌；印章与页面纹理共用）
export function contentSeed(s: string): number {
  let h = 5381;
  for (const c of s) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0;
  return (h % 9000) + 1;
}

// 列槽数：单叶=内容列+半列版心；对开=两组内容列+整列版心
const slotsFor = (cols: number, mode: 'single' | 'spread') =>
  mode === 'spread' ? 2 * cols + 1 : cols + 0.5;
const CT = 'text-anchor="middle" dominant-baseline="central"';

// —— 共享内核 ——

interface Geo {
  pageW: number;
  pageH: number;
  fx0: number;
  fy0: number;
  frameW: number;
  frameH: number;
  colW: number;
  cellH: number;
  fs: number;
  noteFs: number;
  bxFs: number;
}

function makeGeo(o: RenderOptions, slots: number): Geo {
  const pageH = o.pageH ?? BASE_PAGE_H;
  const pageW = o.pageW ?? Math.round(BASE_PAGE_H * BASE_RATIO);
  const { frameW, frameH, fx0, fy0 } = frameDims(pageW, pageH);
  const colW = frameW / slots;
  const cellH = frameH / o.grid.charsPerCol;
  const fs = Math.min(colW * 0.8, cellH * 0.91);
  return {
    pageW,
    pageH,
    fx0,
    fy0,
    frameW,
    frameH,
    colW,
    cellH,
    fs,
    noteFs: fs * 0.5,
    bxFs: Math.min(17, fs * 0.44),
  };
}

function contentHash(pages: (Page | null)[]): number {
  return contentSeed(
    pages
      .map((p) => (p ? p.chars.map((c) => c.ch).join('') + p.folio : ''))
      .join('|'),
  );
}

function buildDefs(g: Geo, o: RenderOptions, seed: number): string {
  const s = o.textureStrength;
  const clip = `<clipPath id="pc"><rect x="${g.fx0}" y="${g.fy0 - 8}" width="${g.frameW}" height="${g.frameH + 16}"/></clipPath>`;
  if (!o.texture) return `<defs>${clip}</defs>`;
  const erode = (id: string, disp: number, pitIntercept: number) => `
    <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="${seed + 5}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${disp.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="${seed + 7}" result="pit"/>
      <feColorMatrix in="pit" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0.9 0.9 0 ${pitIntercept.toFixed(2)}" result="pitA"/>
      <feComposite in="disp" in2="pitA" operator="out"/>
    </filter>`;
  return `<defs>${clip}
    <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="3" seed="${seed}" result="n1"/>
      <feColorMatrix in="n1" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.24  0 0 0 ${(0.83 * s).toFixed(2)} 0"/>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
    <filter id="fineGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="${seed + 2}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.24  0 0 0 0 0.15  0 0 0 ${(0.3 * s).toFixed(2)} 0"/>
    </filter>
    ${erode('inkErode', 4.33 * s, -(0.5 + 0.667 * s))}
    ${erode('inkErodeNote', 2.6 * s, -(0.35 + 0.667 * s))}
    <filter id="frameErode" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.08 0.22" numOctaves="3" seed="${seed + 11}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${(10 * s).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="${seed + 13}" result="pit"/>
      <feColorMatrix in="pit" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.1 1.1 1.1 0 ${-(0.75 + 0.667 * s).toFixed(2)}" result="pitA"/>
      <feComposite in="disp" in2="pitA" operator="out"/>
    </filter>
  </defs>`;
}

function vertText(
  text: string,
  x: number,
  yStart: number,
  size: number,
  fill: string,
): string {
  let out = '';
  let y = yStart;
  for (const ch of text) {
    out += `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${CT}>${esc(ch)}</text>`;
    y += size + 5;
  }
  return out;
}

// 版心内容（鱼尾 + 简名卷次 + 页码），中心线在 cx；单叶模式配合 clip 只露右半
function banxinAt(
  cx: number,
  g: Geo,
  meta: Meta,
  folio: number,
  P: Palette,
  chapter?: string,
): string {
  const ftDepth = g.colW * 0.6; // 鱼尾总深
  const ftNotch = g.colW * 0.42; // 尾尖凹口深
  const yF = g.fy0 + FISHTAIL_POS * g.frameH;
  let out = `<path d="M${cx - g.colW / 2},${yF} h${g.colW} v${ftDepth} l${-g.colW / 2},${-ftNotch} l${-g.colW / 2},${ftNotch} z" fill="${P.frame}"/>`;
  out += vertText(meta.banxinTitle, cx, yF + ftDepth + 14, g.bxFs, P.text);
  out += vertText(
    meta.banxinJuan,
    cx,
    yF + ftDepth + 14 + 3.2 * (g.bxFs + 5),
    g.bxFs,
    P.text,
  );
  if (chapter)
    out += vertText(
      chapter,
      cx,
      yF + ftDepth + 14 + 6.4 * (g.bxFs + 5),
      g.bxFs,
      P.text,
    );
  out += vertText(toCnNum(folio), cx, g.fy0 + g.frameH * 0.78, g.bxFs, P.text);
  return out;
}

interface GlyphLayers {
  bigText: string;
  noteText: string;
  marks: string;
}

function glyphs(
  page: Page,
  colX: (i: number) => number,
  g: Geo,
  P: Palette,
  showPunct: boolean,
  acc: GlyphLayers,
): void {
  const metrics = (ch: PlacedChar) =>
    ch.kind === 'note'
      ? {
          size: g.noteFs,
          fill: P.note,
          x: colX(ch.col) + g.colW * (ch.sub === 'L' ? 0.26 : 0.74),
          y: g.fy0 + ch.half * (g.cellH / 2) + g.cellH / 4,
          markX:
            colX(ch.col) +
            g.colW * (ch.sub === 'L' ? 0.26 : 0.74) +
            g.noteFs * 0.62,
          markR: g.fs * 0.055,
        }
      : {
          size: ch.role === 'author' ? g.fs * 0.85 : g.fs,
          fill: P.text,
          x: colX(ch.col) + g.colW / 2,
          y: g.fy0 + (ch.half / 2) * g.cellH + g.cellH / 2,
          markX: colX(ch.col) + g.colW - 5,
          markR: g.fs * 0.088,
        };
  const sideMark = (ch: PlacedChar, m: { y: number; size: number }): string => {
    if (ch.kind !== 'big' || !ch.mark) return '';
    const x = colX(ch.col) + g.colW - 2.5;
    const y0 = m.y - g.cellH / 2 + 2;
    const y1 = m.y + g.cellH / 2 - 2;
    switch (ch.mark) {
      case 'line': // 专名直线
        return `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${P.text}" stroke-width="1.3"/>`;
      case 'book': {
        // 书名波浪线：四段交替摆动
        const seg = (y1 - y0) / 4;
        let d = `M${x},${y0}`;
        for (let s = 0; s < 4; s++)
          d += ` Q${x + (s % 2 ? -2.2 : 2.2)},${y0 + seg * (s + 0.5)} ${x},${y0 + seg * (s + 1)}`;
        return `<path d="${d}" fill="none" stroke="${P.text}" stroke-width="1.2"/>`;
      }
      case 'circle': // 着重圈注
        return `<circle cx="${x}" cy="${m.y}" r="${(m.size * 0.11).toFixed(1)}" fill="none" stroke="${P.mark}" stroke-width="1.3"/>`;
      case 'dot': // 着重点注
        return `<circle cx="${x}" cy="${m.y}" r="${(m.size * 0.07).toFixed(1)}" fill="${P.mark}"/>`;
    }
  };

  for (const ch of page.chars) {
    const m = metrics(ch);
    const glyph = `<text x="${m.x}" y="${m.y}" font-size="${m.size.toFixed(1)}" fill="${m.fill}" ${CT}>${esc(ch.ch)}</text>`;
    if (ch.kind === 'note') acc.noteText += glyph;
    else acc.bigText += glyph + sideMark(ch, m);
    if (ch.punct && showPunct) {
      const my = m.y + m.size * 0.4;
      acc.marks +=
        ch.punct === 'ju'
          ? `<circle cx="${m.markX}" cy="${my}" r="${m.markR.toFixed(1)}" fill="none" stroke="${P.mark}" stroke-width="1.5"/>`
          : `<circle cx="${m.markX}" cy="${my}" r="${(m.markR * 0.6).toFixed(1)}" fill="${P.mark}"/>`;
    }
  }
}

function assemble(
  g: Geo,
  o: RenderOptions,
  defs: string,
  frame: string,
  t: GlyphLayers,
): string {
  const P = o.palette;
  const body = o.texture
    ? `<rect width="${g.pageW}" height="${g.pageH}" fill="${P.paper}"/>` +
      `<rect width="${g.pageW}" height="${g.pageH}" filter="url(#paperGrain)" fill="none"/>` +
      `<rect width="${g.pageW}" height="${g.pageH}" filter="url(#fineGrain)"/>` +
      `<g filter="url(#frameErode)">${frame}</g>` +
      `<g filter="url(#inkErode)">${t.bigText}</g>` +
      `<g filter="url(#inkErodeNote)">${t.noteText}${t.marks}</g>`
    : `<rect width="${g.pageW}" height="${g.pageH}" fill="${P.paper}"/>${frame}${t.bigText}${t.noteText}${t.marks}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.pageW} ${g.pageH}" font-family="${o.fontFamily}">${defs}${body}${o.overlays ?? ''}</svg>`;
}

// 摆位几何（印章等叠加层用）：与渲染同一套公式
export function pageGeo(o: RenderOptions, mode: 'single' | 'spread') {
  const g = makeGeo(o, slotsFor(o.grid.cols, mode));
  return {
    fx0: g.fx0,
    fy0: g.fy0,
    frameW: g.frameW,
    frameH: g.frameH,
    colW: g.colW,
  };
}

// —— 单半叶：版心=折缝半列（左缘），左框开口 ——
export function renderPage(page: Page, meta: Meta, o: RenderOptions): string {
  const g = makeGeo(o, slotsFor(o.grid.cols, 'single'));
  const P = o.palette;
  const seed = contentHash([page]);
  const defs = buildDefs(g, o, seed);

  let frame = `<path d="M${g.fx0},${g.fy0} H${g.fx0 + g.frameW} V${g.fy0 + g.frameH} H${g.fx0}" fill="none" stroke="${P.frame}" stroke-width="${o.frameWidth}"/>`;
  const innerX = g.fx0 + g.frameW - 5.5 - o.frameWidth / 2;
  frame += `<line x1="${innerX}" y1="${g.fy0}" x2="${innerX}" y2="${g.fy0 + g.frameH}" stroke="${P.frame}" stroke-width="1.1"/>`;
  for (let k = 1; k <= o.grid.cols; k++) {
    const x = g.fx0 + g.frameW - k * g.colW;
    frame += `<line x1="${x}" y1="${g.fy0}" x2="${x}" y2="${g.fy0 + g.frameH}" stroke="${P.line}" stroke-width="0.9"/>`;
  }
  frame += `<g clip-path="url(#pc)">${banxinAt(g.fx0, g, meta, page.folio, P, o.banxinChapter)}</g>`;

  const layers: GlyphLayers = { bigText: '', noteText: '', marks: '' };
  const colX = (i: number) => g.fx0 + g.frameW - (i + 1) * g.colW;
  glyphs(page, colX, g, P, o.showPunct, layers);
  return assemble(g, o, defs, frame, layers);
}

// —— 对开整叶：右半叶 + 中央整列版心（全鱼尾）+ 左半叶，四边闭合双边框 ——
export function renderSpread(
  pageR: Page,
  pageL: Page | null,
  meta: Meta,
  o: RenderOptions,
): string {
  const cols = o.grid.cols;
  const g = makeGeo(o, slotsFor(cols, 'spread'));
  const P = o.palette;
  const seed = contentHash([pageR, pageL]);
  const defs = buildDefs(g, o, seed);

  let frame = `<rect x="${g.fx0}" y="${g.fy0}" width="${g.frameW}" height="${g.frameH}" fill="none" stroke="${P.frame}" stroke-width="${o.frameWidth}"/>`;
  for (const x of [
    g.fx0 + 5.5 + o.frameWidth / 2,
    g.fx0 + g.frameW - 5.5 - o.frameWidth / 2,
  ])
    frame += `<line x1="${x}" y1="${g.fy0}" x2="${x}" y2="${g.fy0 + g.frameH}" stroke="${P.frame}" stroke-width="1.1"/>`;
  for (let m = 1; m <= 2 * cols; m++) {
    const x = g.fx0 + m * g.colW;
    frame += `<line x1="${x}" y1="${g.fy0}" x2="${x}" y2="${g.fy0 + g.frameH}" stroke="${P.line}" stroke-width="0.9"/>`;
  }
  const bxCenter = g.fx0 + (cols + 0.5) * g.colW;
  frame += banxinAt(bxCenter, g, meta, pageR.folio, P, o.banxinChapter);

  const layers: GlyphLayers = { bigText: '', noteText: '', marks: '' };
  const colXR = (i: number) => g.fx0 + g.frameW - (i + 1) * g.colW;
  const colXL = (i: number) => g.fx0 + (cols - 1 - i) * g.colW;
  glyphs(pageR, colXR, g, P, o.showPunct, layers);
  if (pageL) glyphs(pageL, colXL, g, P, o.showPunct, layers);
  return assemble(g, o, defs, frame, layers);
}
