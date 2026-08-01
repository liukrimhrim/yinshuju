// 导出管线（mvp-v1 里程碑 B）：多比例自适应重排 → SVG（内嵌用字命中的字体切片）→ PNG/JPEG / 多页 PDF+书签
import { parse } from './engine/parse';
import { layout } from './engine/layout';
import { renderPage, renderSpread } from './engine/svg';
import { computeLayoutPlan, BASE_RATIO } from './engine/geometry';
import type { RenderOptions } from './engine/svg';
import type { GridParams, Meta } from './engine/types';
import type { FontId } from './engine/themes';
import type { PDFObject, PDFPage } from 'pdf-lib';

export interface RatioPreset {
  id: string;
  label: string;
  ratio: number;
}

// 各平台推荐像素随时变，故只固定比例、分辨率交给倍率（mvp-v1：不写死平台像素）
export const RATIO_PRESETS: readonly RatioPreset[] = [
  { id: 'base', label: '原开本 16:28', ratio: BASE_RATIO },
  { id: 'wallpaper', label: '手机壁纸 9:19.5', ratio: 9 / 19.5 },
  { id: 'r34', label: '竖幅 3:4', ratio: 3 / 4 },
  { id: 'r45', label: '竖幅 4:5', ratio: 4 / 5 },
  { id: 'square', label: '方形对开 1:1', ratio: 1 },
  { id: 'wide', label: '横幅对开 2:1', ratio: 2 },
] as const;

// —— 字体切片内嵌（stack-v1 路线 b）：按用字命中切片，data-URI 进 SVG ——

interface Manifest {
  [fid: string]: {
    family: string;
    slices: { file: string; ranges: [number, number][] }[];
  };
}

let manifestCache: Manifest | null = null;
const sliceB64Cache = new Map<string, string>();

async function fontCSSFor(fontId: FontId, usedText: string): Promise<string> {
  if (fontId === 'serif') return '';
  if (!manifestCache) {
    const res = await fetch('fonts/manifest.json');
    if (!res.ok) return ''; // 无切片（本地未构建字体）→ 依赖查看端字体
    manifestCache = (await res.json()) as Manifest;
  }
  const entry = manifestCache[fontId];
  if (!entry) return '';
  const used = new Set<number>();
  for (const ch of usedText) used.add(ch.codePointAt(0)!);
  const hit = entry.slices.filter((s) =>
    s.ranges.some(([a, b]) => {
      for (const cp of used) if (cp >= a && cp <= b) return true;
      return false;
    }),
  );
  const faces = await Promise.all(
    hit.map(async (s) => {
      let b64 = sliceB64Cache.get(s.file);
      if (!b64) {
        const buf = await (await fetch(`fonts/${s.file}`)).arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000)
          bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        b64 = btoa(bin);
        sliceB64Cache.set(s.file, b64);
      }
      const ranges = s.ranges
        .map(([a, b]) =>
          a === b
            ? `U+${a.toString(16)}`
            : `U+${a.toString(16)}-${b.toString(16)}`,
        )
        .join(',');
      return `@font-face{font-family:'${entry.family}';src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${ranges};}`;
    }),
  );
  return faces.join('');
}

// 文档用字全集：正文+元数据+版心页码可能用到的汉字数码（叶数上限 99 → 十/百收齐）
const CN_NUM_CHARS = '一二三四五六七八九十百';
export function usedTextOf(ctx: ExportContext): string {
  return (
    ctx.text +
    ctx.meta.title +
    ctx.meta.author +
    ctx.meta.banxinTitle +
    ctx.meta.banxinJuan +
    CN_NUM_CHARS
  );
}

// —— 组合：状态 → 指定比例下的（页集, svg 生成器） ——

export interface ExportContext {
  text: string;
  meta: Meta;
  grid: GridParams;
  render: Omit<RenderOptions, 'grid' | 'pageW' | 'pageH'>;
  fontId: FontId;
}

export function planFor(ctx: ExportContext, ratio: number) {
  const plan = computeLayoutPlan(ratio, ctx.grid);
  const pages = layout(parse(ctx.text), ctx.meta, plan.grid);
  const opts: RenderOptions = {
    ...ctx.render,
    grid: plan.grid,
    pageW: plan.pageW,
    pageH: plan.pageH,
  };
  const svgAt = (idx: number): string =>
    plan.mode === 'spread'
      ? renderSpread(pages[idx]!, pages[idx + 1] ?? null, ctx.meta, opts)
      : renderPage(pages[idx]!, ctx.meta, opts);
  // 对开一版吃两叶
  const frames: number[] = [];
  for (let i = 0; i < pages.length; i += plan.mode === 'spread' ? 2 : 1)
    frames.push(i);
  return { plan, pages, svgAt, frames };
}

async function svgToCanvas(
  svg: string,
  w: number,
  h: number,
  k: number,
): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src =
    'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * k);
  cv.height = Math.round(h * k);
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

function withFontCSS(svg: string, css: string): string {
  return css ? svg.replace('>', `><style>${css}</style>`) : svg;
}

export interface ImageOptions {
  format: 'png' | 'jpeg';
  quality: number;
  scale: number;
}

export interface ImageResult {
  blob: Blob;
  w: number;
  h: number;
  fontEmbedded: boolean; // false = 切片缺失，导出退化为查看端字体
}

export async function exportImage(
  ctx: ExportContext,
  ratio: number,
  frameIdx: number,
  opts: ImageOptions,
): Promise<ImageResult> {
  const { plan, svgAt } = planFor(ctx, ratio);
  const css = await fontCSSFor(ctx.fontId, usedTextOf(ctx));
  const svg = withFontCSS(svgAt(frameIdx), css);
  const cv = await svgToCanvas(svg, plan.pageW, plan.pageH, opts.scale);
  const blob = await new Promise<Blob>((res, rej) =>
    cv.toBlob(
      (b) => (b ? res(b) : rej(new Error('toBlob failed'))),
      `image/${opts.format}`,
      opts.quality,
    ),
  );
  return {
    blob,
    w: cv.width,
    h: cv.height,
    fontEmbedded: ctx.fontId === 'serif' || css !== '',
  };
}

// —— PDF：固定 16×28cm 开本多页 + 篇题书签（pdf-lib 低层 outline） ——

const PDF_W_PT = 453.543; // 16cm
const PDF_H_PT = 793.701; // 28cm

export interface PdfResult {
  blob: Blob;
  fontEmbedded: boolean;
}

export async function exportPdf(
  ctx: ExportContext,
  scale: number,
  onProgress?: (done: number, total: number) => void,
): Promise<PdfResult> {
  const { PDFDocument, PDFName, PDFHexString, PDFNumber, PDFArray } =
    await import('pdf-lib');
  const { pages, svgAt, plan } = planFor(ctx, BASE_RATIO);
  const css = await fontCSSFor(ctx.fontId, usedTextOf(ctx));
  const doc = await PDFDocument.create();
  doc.setTitle(ctx.meta.title);

  const pdfPages: PDFPage[] = [];
  for (let i = 0; i < pages.length; i++) {
    const svg = withFontCSS(svgAt(i), css);
    const cv = await svgToCanvas(svg, plan.pageW, plan.pageH, scale);
    const png = await new Promise<Blob>((res, rej) =>
      cv.toBlob(
        (b) => (b ? res(b) : rej(new Error('toBlob failed'))),
        'image/png',
      ),
    );
    const im = await doc.embedPng(await png.arrayBuffer());
    const pg = doc.addPage([PDF_W_PT, PDF_H_PT]);
    pg.drawImage(im, { x: 0, y: 0, width: PDF_W_PT, height: PDF_H_PT });
    pdfPages.push(pg);
    onProgress?.(i + 1, pages.length);
  }

  // 书签：每页起始篇题 → 扁平 outline
  const items = pages.flatMap((p, i) =>
    p.chapters.map((title) => ({ title, pageIdx: i })),
  );
  if (items.length) {
    const ctx2 = doc.context;
    const rootRef = ctx2.nextRef();
    const itemRefs = items.map(() => ctx2.nextRef());
    items.forEach((it, i) => {
      const dest = PDFArray.withContext(ctx2);
      dest.push(pdfPages[it.pageIdx]!.ref);
      dest.push(PDFName.of('XYZ'));
      dest.push(PDFNumber.of(0));
      dest.push(PDFNumber.of(PDF_H_PT));
      dest.push(PDFNumber.of(0));
      const node: Record<string, PDFObject> = {
        Title: PDFHexString.fromText(it.title),
        Parent: rootRef,
        Dest: dest,
      };
      if (i > 0) node.Prev = itemRefs[i - 1]!;
      if (i < items.length - 1) node.Next = itemRefs[i + 1]!;
      ctx2.assign(
        itemRefs[i]!,
        ctx2.obj(node as Parameters<typeof ctx2.obj>[0]),
      );
    });
    ctx2.assign(
      rootRef,
      ctx2.obj({
        Type: PDFName.of('Outlines'),
        First: itemRefs[0]!,
        Last: itemRefs[items.length - 1]!,
        Count: items.length,
      }),
    );
    doc.catalog.set(PDFName.of('Outlines'), rootRef);
  }

  // 不用 object streams：outline/catalog 保持明文对象，老阅读器兼容性更好
  const bytes = await doc.save({ useObjectStreams: false });
  return {
    blob: new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
    fontEmbedded: ctx.fontId === 'serif' || css !== '',
  };
}
