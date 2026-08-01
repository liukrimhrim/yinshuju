import type { GridParams, Meta, Page, PlacedChar } from './types';
import type { Palette } from './themes';

export interface RenderOptions {
  grid: GridParams;
  palette: Palette;
  frameWidth: number;
  texture: boolean;
  textureStrength: number; // 0–1，默认 0.6
  fontFamily: string;
  showPunct: boolean;
}

// 版面几何常量（1cm = 40u，16×28cm 半叶；比例来源：版式规范研究 §8）
const PAGE_W = 640;
const PAGE_H = 1120;
const FRAME_H_OVER_PAGE = 0.68;
const FRAME_W_OVER_H = 0.7;
const TOP_OVER_BOTTOM = 1.5;
const FISHTAIL_POS = 0.25;

const CN_DIGITS = '一二三四五六七八九';
export function toCnNum(n: number): string {
  if (n <= 0 || n > 99) return String(n);
  if (n < 10) return CN_DIGITS[n - 1]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens > 1 ? CN_DIGITS[tens - 1]! : '') + '十' + (ones ? CN_DIGITS[ones - 1]! : '');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CT = 'text-anchor="middle" dominant-baseline="central"';

export function renderPage(page: Page, meta: Meta, o: RenderOptions): string {
  const frameH = FRAME_H_OVER_PAGE * PAGE_H;
  const frameW = FRAME_W_OVER_H * frameH;
  const fy0 = ((PAGE_H - frameH) * TOP_OVER_BOTTOM) / (1 + TOP_OVER_BOTTOM);
  const fx0 = (PAGE_W - frameW) / 2;
  const colW = frameW / (o.grid.cols + 0.5); // 版心=半列（折缝切走另一半）
  const cellH = frameH / o.grid.charsPerCol;
  const fs = Math.min(colW * 0.8, cellH * 0.91);
  const noteFs = fs * 0.5;
  const colX = (i: number) => fx0 + frameW - (i + 1) * colW;
  const P = o.palette;

  // —— defs：版框裁剪 + 做旧滤镜（强度参数化；小字侵蚀减档 = 易读性守则） ——
  const s = o.textureStrength;
  const clip = `<clipPath id="pc"><rect x="${fx0}" y="${fy0 - 8}" width="${frameW}" height="${frameH + 16}"/></clipPath>`;
  const erode = (id: string, disp: number, pitIntercept: number) => `
    <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="11" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${disp.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="23" result="pit"/>
      <feColorMatrix in="pit" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0.9 0.9 0 ${pitIntercept.toFixed(2)}" result="pitA"/>
      <feComposite in="disp" in2="pitA" operator="out"/>
    </filter>`;
  const defs = o.texture
    ? `<defs>${clip}
      <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="3" seed="7" result="n1"/>
        <feColorMatrix in="n1" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.24  0 0 0 ${(0.83 * s).toFixed(2)} 0"/>
        <feComposite operator="over" in2="SourceGraphic"/>
      </filter>
      <filter id="fineGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="3"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.24  0 0 0 0 0.15  0 0 0 ${(0.3 * s).toFixed(2)} 0"/>
      </filter>
      ${erode('inkErode', 4.33 * s, -(0.5 + 0.667 * s))}
      ${erode('inkErodeNote', 2.6 * s, -(0.35 + 0.667 * s))}
      <filter id="frameErode" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.08 0.22" numOctaves="3" seed="5" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${(10 * s).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="31" result="pit"/>
        <feColorMatrix in="pit" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.1 1.1 1.1 0 ${-(0.75 + 0.667 * s).toFixed(2)}" result="pitA"/>
        <feComposite in="disp" in2="pitA" operator="out"/>
      </filter>
    </defs>`
    : `<defs>${clip}</defs>`;

  // —— 版框：左侧开口（折口），右侧双边 ——
  let frame = `<path d="M${fx0},${fy0} H${fx0 + frameW} V${fy0 + frameH} H${fx0}" fill="none" stroke="${P.frame}" stroke-width="${o.frameWidth}"/>`;
  const innerX = fx0 + frameW - 5.5 - o.frameWidth / 2;
  frame += `<line x1="${innerX}" y1="${fy0}" x2="${innerX}" y2="${fy0 + frameH}" stroke="${P.frame}" stroke-width="1.1"/>`;
  for (let k = 1; k <= o.grid.cols; k++) {
    const x = fx0 + frameW - k * colW;
    frame += `<line x1="${x}" y1="${fy0}" x2="${x}" y2="${fy0 + frameH}" stroke="${P.line}" stroke-width="0.9"/>`;
  }

  // —— 版心（折缝半列）：半鱼尾 + 半字书名卷次 + 页码 ——
  const d = colW * 0.6;
  const c = colW * 0.42;
  const yF = fy0 + FISHTAIL_POS * frameH;
  const bxFs = Math.min(17, fs * 0.44);
  const vert = (text: string, x: number, yStart: number, size: number, fill: string) => {
    let out = '';
    let y = yStart;
    for (const ch of text) {
      out += `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${CT}>${esc(ch)}</text>`;
      y += size + 5;
    }
    return out;
  };
  let banxin = `<path d="M${fx0 - colW / 2},${yF} h${colW} v${d} l${-colW / 2},${-c} l${-colW / 2},${c} z" fill="${P.frame}"/>`;
  banxin += vert(meta.banxinTitle, fx0, yF + d + 14, bxFs, P.text);
  banxin += vert(meta.banxinJuan, fx0, yF + d + 14 + 3.2 * (bxFs + 5), bxFs, P.text);
  banxin += vert(toCnNum(page.folio), fx0, fy0 + frameH * 0.78, bxFs, P.text);
  frame += `<g clip-path="url(#pc)">${banxin}</g>`;

  // —— 文字与圈点 ——
  const charFs = (ch: PlacedChar) => (ch.kind === 'note' ? noteFs : ch.role === 'author' ? fs * 0.85 : fs);
  const charX = (ch: PlacedChar) =>
    ch.kind === 'note' ? colX(ch.col) + colW * (ch.sub === 'L' ? 0.26 : 0.74) : colX(ch.col) + colW / 2;
  const charY = (ch: PlacedChar) =>
    ch.kind === 'note' ? fy0 + ch.half * (cellH / 2) + cellH / 4 : fy0 + (ch.half / 2) * cellH + cellH / 2;

  let text = '';
  let marks = '';
  for (const ch of page.chars) {
    const fill = ch.kind === 'note' ? P.note : P.text;
    text += `<text x="${charX(ch)}" y="${charY(ch)}" font-size="${charFs(ch).toFixed(1)}" fill="${fill}" ${CT}>${esc(ch.ch)}</text>`;
    if (ch.punct && o.showPunct) {
      const big = ch.kind === 'big';
      const mx = big ? colX(ch.col) + colW - 5 : charX(ch) + noteFs * 0.62;
      const my = charY(ch) + charFs(ch) * 0.4;
      const r = big ? fs * 0.088 : fs * 0.055;
      marks +=
        ch.punct === 'ju'
          ? `<circle cx="${mx}" cy="${my}" r="${r.toFixed(1)}" fill="none" stroke="${P.mark}" stroke-width="1.5"/>`
          : `<circle cx="${mx}" cy="${my}" r="${(r * 0.6).toFixed(1)}" fill="${P.mark}"/>`;
    }
  }

  const body = o.texture
    ? `<rect width="${PAGE_W}" height="${PAGE_H}" fill="${P.paper}"/>` +
      `<rect width="${PAGE_W}" height="${PAGE_H}" filter="url(#paperGrain)" fill="none"/>` +
      `<rect width="${PAGE_W}" height="${PAGE_H}" filter="url(#fineGrain)"/>` +
      `<g filter="url(#frameErode)">${frame}</g>` +
      `<g filter="url(#inkErode)">${text}</g>` +
      `<g filter="url(#inkErodeNote)">${marks}</g>`
    : `<rect width="${PAGE_W}" height="${PAGE_H}" fill="${P.paper}"/>${frame}${text}${marks}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" font-family="${o.fontFamily}">${defs}${body}</svg>`;
}
