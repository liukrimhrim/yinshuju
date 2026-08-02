import type { Meta, Page, PlacedChar } from './types';
import type { Palette } from './themes';
import { BASE_PAGE_H, BASE_RATIO, frameDims } from './geometry';
import type { GridParams } from './types';
import { latinSpan, latinWidthEm, segmentLatin } from './latin';

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
  fishtail?: FishtailSpec; // 鱼尾形制；缺省=单黑鱼尾（历代最普遍）
  folioStart?: number; // 起始页码（首叶印作几，缺省一）
  folioNumeral?: 'cn' | 'ar'; // 页码字形：中文数字／阿拉伯数字
  showFolio?: boolean; // 是否印页码，缺省印
  indentTop?: number; // 天头留白（字位）——仅供印章等叠加层定位
  indentBottom?: number; // 地脚留白（字位）
  authorReserve?: number; // 题署距底留白（字位）——印章槽位据此上移
  charFillV?: number; // 纵向：字高 / 一字格高（默认 0.80）——控上下字距
  charFillH?: number; // 横向：字宽 / 列宽（默认 0.68）——控字与界行的距离
  latinFamily?: string; // 拉丁/数字字体；缺省＝随汉字字体
}

// 鱼尾（版式规范票 §1/§8）：单/双尾、黑(实心)/白(线描)/花(带饰)、双尾顺(同向)/对(尾尖相向)
export interface FishtailSpec {
  count: 1 | 2;
  style: 'black' | 'white' | 'line' | 'flower';
  pairing: 'aligned' | 'opposed';
}

export const DEFAULT_FISHTAIL: FishtailSpec = {
  count: 1,
  style: 'black',
  pairing: 'opposed',
};

const FISHTAIL_POS = 0.25; // 上鱼尾顶距版心顶 1/4（规范票 §1）
const LOWER_FISHTAIL_POS = 0.62;

const CN_DIGITS = '一二三四五六七八九';
export function toCnNum(n: number): string {
  if (n <= 0 || n > 999) return String(n);
  if (n < 10) return CN_DIGITS[n - 1]!;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (
      (tens > 1 ? CN_DIGITS[tens - 1]! : '') +
      '十' +
      (ones ? CN_DIGITS[ones - 1]! : '')
    );
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!rest) return CN_DIGITS[hundreds - 1]! + '百';
  // 十位为零则补「零」：一百零五
  return (
    CN_DIGITS[hundreds - 1]! + '百' + (rest < 10 ? '零' : '') + toCnNum(rest)
  );
}

// 拉丁/数字字体：缺省随汉字字体（同一字体家族最协调）；
// 亦可指定西文衬线（汉字字体的西文字形若不佳时用）
export const LATIN_SERIF = "Georgia,'Times New Roman',serif";

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
  tx1: number; // 正文区右缘（列自此向左排）
  ty0: number; // 正文区上缘
  fs: number;
  sx: number; // 字形横向缩放
  noteFs: number;
  bxFs: number;
}

// 框内留白：刻本正文不贴版框。右侧还须避开双边内线（renderPage 画在 5.5+框宽/2 处）
const INNER_LINE_OFFSET = 5.5;
const padOf = (frameWidth: number) => ({
  side: INNER_LINE_OFFSET + frameWidth + 3,
  vert: frameWidth / 2 + 5,
});

function makeGeo(
  o: RenderOptions,
  slots: number,
  mode: 'single' | 'spread',
): Geo {
  const pageH = o.pageH ?? BASE_PAGE_H;
  const pageW = o.pageW ?? Math.round(BASE_PAGE_H * BASE_RATIO);
  const { frameW, frameH, fx0: baseFx0, fy0 } = frameDims(pageW, pageH);
  // 单半叶：折缝即版心中缝，故版框左缘（=版心中线）贴页面左边，无外白边；
  // 水平余幅全归订口侧（右）。对开整叶两侧对称。
  const fx0 = mode === 'single' ? 0 : baseFx0;
  const pad = padOf(o.frameWidth);
  // 单叶：仅右侧有内线（左缘是折缝）；对开：左右都有
  const usableW = frameW - (mode === 'spread' ? 2 * pad.side : pad.side);
  const usableH = frameH - 2 * pad.vert;
  const colW = usableW / slots;
  const cellH = usableH / o.grid.charsPerCol;
  // 纵向定字号，横向定字宽；二者不等则字形横向压缩/舒展（长体/扁体，刻本常式）
  const fs = cellH * (o.charFillV ?? 0.8);
  const glyphW = colW * (o.charFillH ?? 0.68); // 字面留呼吸空间，避免贴框贴线
  return {
    pageW,
    pageH,
    fx0,
    fy0,
    frameW,
    frameH,
    colW,
    cellH,
    tx1: fx0 + frameW - pad.side,
    ty0: fy0 + pad.vert,
    fs,
    sx: glyphW / fs, // 横向缩放（1＝方形字）
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

// 读（丶）：毛笔「点」——横卧笔势，左端露锋起笔尖细，右端按笔肥厚圆钝
function douStroke(x: number, y: number, len: number, fill: string): string {
  const th = len * 0.52; // 笔画厚度
  const x0 = x - len * 0.42; // 重心落在锚点
  const y0 = y;
  const P = (dx: number, dy: number) =>
    `${(x0 + len * dx).toFixed(1)},${(y0 + th * dy).toFixed(1)}`;
  return (
    `<path d="M${P(0, 0)}` +
    ` C${P(0.42, -0.34)} ${P(0.8, -0.5)} ${P(1, -0.06)}` + // 上缘：起笔尖 → 按笔
    ` C${P(1.05, 0.34)} ${P(0.74, 0.55)} ${P(0.44, 0.4)}` + // 右端圆钝回锋
    ` C${P(0.24, 0.29)} ${P(0.09, 0.14)} ${P(0, 0)} Z"` + // 下缘收回尖端
    ` fill="${fill}" transform="rotate(24 ${x.toFixed(1)} ${y.toFixed(1)})"/>` // 顺笔势右下倾
  );
}

// 版心字号标记：*小* / **大**（版心本就小字，故倍率取 0.8 / 1.35）
const BANXIN_SIZE = { small: 0.8, body: 1, large: 1.35 } as const;
function splitBanxinSized(text: string) {
  const out: { s: string; k: keyof typeof BANXIN_SIZE }[] = [];
  let cur: keyof typeof BANXIN_SIZE = 'body';
  let buf = '';
  const flush = () => {
    if (buf) out.push({ s: buf, k: cur });
    buf = '';
  };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*') {
      const double = text[i + 1] === '*';
      const want = double ? 'large' : 'small';
      flush();
      cur = cur === want ? 'body' : (want as keyof typeof BANXIN_SIZE);
      if (double) i++;
      continue;
    }
    buf += text[i];
  }
  flush();
  return out;
}

// 版心等窄列的竖排文字：支持字号标记；拉丁段同样縦中横/转 90°
function vertText(
  text: string,
  x: number,
  yStart: number,
  baseSize: number,
  fill: string,
  latinFam = LATIN_SERIF,
): { svg: string; next: number } {
  let out = '';
  let y = yStart;
  for (const chunk of splitBanxinSized(text)) {
    const size = baseSize * BANXIN_SIZE[chunk.k];
    const adv = size + 5;
    for (const seg of segmentLatin(chunk.s)) {
      if (!seg.latin) {
        out += `<text x="${x}" y="${y}" font-size="${size.toFixed(1)}" fill="${fill}" ${CT}>${esc(seg.s)}</text>`;
        y += adv;
        continue;
      }
      const { hSpan, upright } = latinSpan(seg.s);
      const cells = hSpan / 2;
      if (upright) {
        out += `<text x="${x}" y="${y}" font-size="${(size * 0.82).toFixed(1)}" fill="${fill}" font-family="${latinFam}" textLength="${(size * 0.92).toFixed(1)}" lengthAdjust="spacingAndGlyphs" ${CT}>${esc(seg.s)}</text>`;
        y += adv;
      } else {
        const cy = y + ((cells - 1) * adv) / 2;
        const fsz = size * 0.88;
        const len = Math.min(latinWidthEm(seg.s) * fsz, cells * adv * 0.94);
        out += `<text x="${x}" y="${cy.toFixed(1)}" font-size="${fsz.toFixed(1)}" fill="${fill}" font-family="${latinFam}" textLength="${len.toFixed(1)}" lengthAdjust="spacingAndGlyphs" transform="rotate(90 ${x.toFixed(1)} ${cy.toFixed(1)})" ${CT}>${esc(seg.s)}</text>`;
        y += cells * adv;
      }
    }
  }
  return { svg: out, next: y };
}

// 版心内容（鱼尾 + 简名卷次 + 页码），中心线在 cx；单叶模式配合 clip 只露右半
// 叉口线段（不含起点 M，起点为右尾尖）：右尾尖 → 中央尖峰 → 左尾尖
// wavy=花鱼尾的云头波浪叉
function forkSegs(
  cx: number,
  w: number,
  yBase: number,
  notch: number,
  dir: 1 | -1,
  wavy: boolean,
): string {
  const peakY = yBase - dir * notch;
  // 花鱼尾：每侧三枚同向下垂的弧（云头/贝叶），端点精确故中央尖峰保持锐利
  const LOBES = 4; // 弧数多而浅，成细密云头
  const half = (fx: number, fy: number, tx: number, ty: number) => {
    if (!wavy) return `L${tx.toFixed(1)},${ty.toFixed(1)}`;
    let out = '';
    const amp = notch * 0.115;
    for (let i = 0; i < LOBES; i++) {
      const p0x = fx + ((tx - fx) * i) / LOBES;
      const p0y = fy + ((ty - fy) * i) / LOBES;
      const p1x = fx + ((tx - fx) * (i + 1)) / LOBES;
      const p1y = fy + ((ty - fy) * (i + 1)) / LOBES;
      out += `Q${((p0x + p1x) / 2).toFixed(1)},${((p0y + p1y) / 2 + dir * amp).toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)}`;
    }
    return out;
  };
  return (
    half(cx + w / 2, yBase, cx, peakY) + half(cx, peakY, cx - w / 2, yBase)
  );
}

// 独立的一道叉线（含起点）
const forkLine = (
  cx: number,
  w: number,
  yBase: number,
  notch: number,
  dir: 1 | -1,
  wavy: boolean,
) =>
  `M${(cx + w / 2).toFixed(1)},${yBase.toFixed(1)}` +
  forkSegs(cx, w, yBase, notch, dir, wavy);

// 花鱼尾的白叶饰：每侧两片，对称排在带内（范例：黑带上留白叶）
function leaves(
  cx: number,
  w: number,
  yHead: number,
  depth: number,
  dir: 1 | -1,
  P: Palette,
): string {
  const rx = w * 0.055;
  const ry = w * 0.024;
  let out = '';
  for (const side of [-1, 1] as const)
    for (const [kx, ky, rot] of [
      [0.17, 0.26, 32],
      [0.3, 0.4, 58],
    ] as const) {
      const x = cx + side * w * kx;
      const y = yHead + dir * depth * ky;
      out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${P.paper}" transform="rotate(${side * rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
  return out;
}

// 一枚鱼尾：扁带状，叉口几乎切穿整带（范例形制）。tipsUp=对鱼尾的下尾（镜像）
function fishtail(
  cx: number,
  yTop: number,
  w: number,
  depth: number,
  notch: number,
  tipsUp: boolean,
  style: FishtailSpec['style'],
  P: Palette,
): string {
  const dir: 1 | -1 = tipsUp ? -1 : 1;
  const yHead = tipsUp ? yTop + depth : yTop; // 平头一侧（贴象鼻界线）
  const yBase = tipsUp ? yTop : yTop + depth; // 尾尖一侧
  const left = cx - w / 2;
  const right = cx + w / 2;
  const wavy = style === 'flower';
  const body =
    `M${left},${yHead} H${right} V${yBase} ` +
    forkSegs(cx, w, yBase, notch, dir, wavy) +
    ` Z`;
  // 象鼻界线：鱼尾平头外一道细横线
  const ruleY = yHead - dir * depth * 0.18;
  const headRule = `<line x1="${left}" y1="${ruleY.toFixed(1)}" x2="${right}" y2="${ruleY.toFixed(1)}" stroke="${P.frame}" stroke-width="1.2"/>`;

  // 叉外回声细线：黑/白鱼尾共有（范例：叉口下再回一道同形线）
  const echo = `<path d="${forkLine(cx, w, yBase + dir * depth * 0.3, notch * 0.92, dir, wavy)}" fill="none" stroke="${P.frame}" stroke-width="1.3"/>`;

  if (style === 'white')
    // 白鱼尾＝黑鱼尾不着墨：只留叉线与回声线（两侧竖边本就是版心界线，不重画）
    return (
      headRule +
      `<path d="${forkLine(cx, w, yBase, notch, dir, wavy)}" fill="none" stroke="${P.frame}" stroke-width="1.5"/>` +
      echo
    );

  if (style === 'line') {
    // 线鱼尾＝由若干线条组成：叉线自带内向上层叠成扇，另加回声线
    let out = headRule;
    for (const k of [0, 0.2, 0.4])
      out += `<path d="${forkLine(cx, w, yBase - dir * depth * k, notch - depth * k * 0.45, dir, wavy)}" fill="none" stroke="${P.frame}" stroke-width="1.3"/>`;
    return out; // 三道即足；再多则如军衔章
  }

  let out = headRule + `<path d="${body}" fill="${P.frame}"/>`;
  if (style === 'flower') out += leaves(cx, w, yHead, depth, dir, P);
  else out += echo;
  return out;
}

function banxinAt(
  cx: number,
  g: Geo,
  meta: Meta,
  folio: number,
  P: Palette,
  latinFam: string,
  chapter?: string,
  ft: FishtailSpec = DEFAULT_FISHTAIL,
  folioOpt?: Pick<RenderOptions, 'folioStart' | 'folioNumeral' | 'showFolio'>,
): string {
  const ftDepth = g.colW * 0.44; // 鱼尾带高（范例为扁带，非高块）
  const ftNotch = ftDepth * 0.86; // 叉口几乎切穿整带，两侧只余细尖
  const yF = g.fy0 + FISHTAIL_POS * g.frameH;
  const yLower = g.fy0 + LOWER_FISHTAIL_POS * g.frameH;
  let out = fishtail(cx, yF, g.colW, ftDepth, ftNotch, false, ft.style, P);
  if (ft.count === 2)
    out += fishtail(
      cx,
      yLower,
      g.colW,
      ftDepth,
      ftNotch,
      ft.pairing === 'opposed', // 对鱼尾：下尾尖相向朝上；顺鱼尾：同向朝下
      ft.style,
      P,
    );
  else
    // 单尾本常式：版心约 3/4 处一道横细线（规范票 §2）
    out += `<line x1="${cx - g.colW / 2}" y1="${g.fy0 + 0.75 * g.frameH}" x2="${cx + g.colW / 2}" y2="${g.fy0 + 0.75 * g.frameH}" stroke="${P.frame}" stroke-width="1"/>`;
  // 书名 → 卷次 → 篇题：顺序堆叠（原按固定档位摆放，书名一长即互相压字）
  const GAP = g.bxFs * 0.55;
  let cursor = yF + ftDepth + 14;
  for (const seg of [meta.banxinTitle, meta.banxinJuan, chapter]) {
    if (!seg) continue;
    const r = vertText(seg, cx, cursor, g.bxFs, P.text, latinFam);
    out += r.svg;
    cursor = r.next + GAP;
  }
  // 页码：单尾在 3/4 横线下；双尾在下鱼尾之下
  const folioY =
    ft.count === 2
      ? yLower + ftDepth + 14
      : g.fy0 + 0.75 * g.frameH + g.bxFs * 0.9;
  if (folioOpt?.showFolio !== false) {
    const n = folio + ((folioOpt?.folioStart ?? 1) - 1);
    const label = folioOpt?.folioNumeral === 'ar' ? String(n) : toCnNum(n);
    out += vertText(label, cx, folioY, g.bxFs, P.text, latinFam).svg;
  }
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
  latinFam: string,
): void {
  // 纵向中心＝起点半格 + 占格数之半（夹注 1 格、正文 2 格、大字 4 格通用）
  const centerY = (ch: PlacedChar) => {
    const span = ch.hSpan ?? (ch.kind === 'note' ? 1 : 2);
    return g.ty0 + (ch.half + span / 2) * (g.cellH / 2);
  };
  const metrics = (ch: PlacedChar) =>
    ch.kind === 'note'
      ? {
          size: g.noteFs * (ch.scale ?? 1),
          fill: P.note,
          x: colX(ch.col) + g.colW * (ch.sub === 'L' ? 0.26 : 0.74),
          y: centerY(ch),
          markX:
            colX(ch.col) +
            g.colW * (ch.sub === 'L' ? 0.26 : 0.74) +
            g.noteFs * 0.62,
          markR: g.fs * 0.072,
        }
      : {
          size: g.fs * (ch.scale ?? 1), // 书名/著者的倍率由 layout 写入
          fill: P.text,
          x: colX(ch.col) + g.colW / 2,
          y: centerY(ch),
          markX: colX(ch.col) + g.colW - 6.4,
          markR: g.fs * 0.115, // 圈点加大加粗，远看也醒目
        };
  const sideMark = (ch: PlacedChar, m: { y: number; size: number }): string => {
    if (ch.kind !== 'big' || !ch.mark) return '';
    const x = colX(ch.col) + g.colW - 2;
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
    let glyph: string;
    if (ch.kind === 'latin') {
      const span = (ch.hSpan ?? 2) * (g.cellH / 2);
      glyph = ch.upright
        ? // 縦中横：直立压入一字位
          `<text x="${m.x}" y="${m.y}" font-size="${(m.size * 0.82).toFixed(1)}" fill="${m.fill}" font-family="${latinFam}" textLength="${(g.colW * 0.66).toFixed(1)}" lengthAdjust="spacingAndGlyphs" ${CT}>${esc(ch.ch)}</text>`
        : // 转 90°：沿列向横排，长度贴合所占格数
          ((fsz) =>
            `<text x="${m.x}" y="${m.y}" font-size="${fsz.toFixed(1)}" fill="${m.fill}" font-family="${latinFam}" textLength="${Math.min(latinWidthEm(ch.ch) * fsz, span * 0.96).toFixed(1)}" lengthAdjust="spacingAndGlyphs" transform="rotate(90 ${m.x.toFixed(1)} ${m.y.toFixed(1)})" ${CT}>${esc(ch.ch)}</text>`)(
            m.size * 0.88,
          );
    } else {
      const sx = g.sx;
      const tf =
        Math.abs(sx - 1) < 0.001
          ? ''
          : ` transform="translate(${(m.x * (1 - sx)).toFixed(2)},0) scale(${sx.toFixed(3)},1)"`;
      glyph = `<text x="${m.x}" y="${m.y}" font-size="${m.size.toFixed(1)}" fill="${m.fill}"${tf} ${CT}>${esc(ch.ch)}</text>`;
    }
    if (ch.kind === 'note') acc.noteText += glyph;
    else acc.bigText += glyph + sideMark(ch, m);
    if (ch.punct && showPunct) {
      const my = m.y + m.size * 0.4;
      acc.marks +=
        ch.punct === 'ju'
          ? // 句：厚环小圈（笔画随字号走，非固定线宽）
            `<circle cx="${m.markX}" cy="${my}" r="${(m.markR * 0.82).toFixed(1)}" fill="none" stroke="${P.mark}" stroke-width="${(m.markR * 0.56).toFixed(1)}"/>`
          : douStroke(m.markX, my, m.markR * 2.6, P.mark); // 读：点长≈句圈直径 1.6 倍
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
  const g = makeGeo(o, slotsFor(o.grid.cols, mode), mode);
  return {
    fx0: g.fx0,
    fy0: g.fy0,
    frameW: g.frameW,
    frameH: g.frameH,
    colW: g.colW,
    tx1: g.tx1,
    ty0: g.ty0 + (o.indentTop ?? 0) * g.cellH,
    cellH: g.cellH,
    rows: o.grid.charsPerCol - (o.indentTop ?? 0) - (o.indentBottom ?? 0),
    reserve: o.authorReserve ?? 2,
  };
}

// —— 单半叶：版心=折缝半列（左缘），左框开口 ——
export function renderPage(page: Page, meta: Meta, o: RenderOptions): string {
  const g = makeGeo(o, slotsFor(o.grid.cols, 'single'), 'single');
  const latinFam = o.latinFamily ?? o.fontFamily;
  const P = o.palette;
  const seed = contentHash([page]);
  const defs = buildDefs(g, o, seed);

  let frame = `<path d="M${g.fx0},${g.fy0} H${g.fx0 + g.frameW} V${g.fy0 + g.frameH} H${g.fx0}" fill="none" stroke="${P.frame}" stroke-width="${o.frameWidth}"/>`;
  const innerX = g.fx0 + g.frameW - 5.5 - o.frameWidth / 2;
  frame += `<line x1="${innerX}" y1="${g.fy0}" x2="${innerX}" y2="${g.fy0 + g.frameH}" stroke="${P.frame}" stroke-width="1.1"/>`;
  for (let k = 1; k <= o.grid.cols; k++) {
    const x = g.tx1 - k * g.colW;
    frame += `<line x1="${x}" y1="${g.fy0}" x2="${x}" y2="${g.fy0 + g.frameH}" stroke="${P.line}" stroke-width="0.9"/>`;
  }
  frame += `<g clip-path="url(#pc)">${banxinAt(g.fx0, g, meta, page.folio, P, latinFam, o.banxinChapter, o.fishtail, o)}</g>`;

  const layers: GlyphLayers = { bigText: '', noteText: '', marks: '' };
  const colX = (i: number) => g.tx1 - (i + 1) * g.colW;
  glyphs(page, colX, g, P, o.showPunct, layers, latinFam);
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
  const g = makeGeo(o, slotsFor(cols, 'spread'), 'spread');
  const latinFam = o.latinFamily ?? o.fontFamily;
  const P = o.palette;
  const seed = contentHash([pageR, pageL]);
  const defs = buildDefs(g, o, seed);

  let frame = `<rect x="${g.fx0}" y="${g.fy0}" width="${g.frameW}" height="${g.frameH}" fill="none" stroke="${P.frame}" stroke-width="${o.frameWidth}"/>`;
  for (const x of [
    g.fx0 + 5.5 + o.frameWidth / 2,
    g.fx0 + g.frameW - 5.5 - o.frameWidth / 2,
  ])
    frame += `<line x1="${x}" y1="${g.fy0}" x2="${x}" y2="${g.fy0 + g.frameH}" stroke="${P.frame}" stroke-width="1.1"/>`;
  const spreadX0 = g.tx1 - (2 * cols + 1) * g.colW; // 正文区左缘
  for (let m = 1; m <= 2 * cols; m++) {
    const x = spreadX0 + m * g.colW;
    frame += `<line x1="${x}" y1="${g.fy0}" x2="${x}" y2="${g.fy0 + g.frameH}" stroke="${P.line}" stroke-width="0.9"/>`;
  }
  const bxCenter = spreadX0 + (cols + 0.5) * g.colW;
  frame += banxinAt(
    bxCenter,
    g,
    meta,
    pageR.folio,
    P,
    latinFam,
    o.banxinChapter,
    o.fishtail,
    o,
  );

  const layers: GlyphLayers = { bigText: '', noteText: '', marks: '' };
  const colXR = (i: number) => g.tx1 - (i + 1) * g.colW;
  const colXL = (i: number) => spreadX0 + (cols - 1 - i) * g.colW;
  glyphs(pageR, colXR, g, P, o.showPunct, layers, latinFam);
  if (pageL) glyphs(pageL, colXL, g, P, o.showPunct, layers, latinFam);
  return assemble(g, o, defs, frame, layers);
}
