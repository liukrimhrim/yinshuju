import { parse } from './engine/parse';
import { layout } from './engine/layout';
import { renderPage, renderSpread } from './engine/svg';
import type { FishtailSpec } from './engine/svg';
import { BASE_PAGE_H, SPREAD_PAGE_W } from './engine/geometry';
import {
  THEMES,
  DEFAULT_THEME_ID,
  fontFamily,
  type FontId,
  type Palette,
  type Theme,
} from './engine/themes';
import type { Meta } from './engine/types';
import { DEMO_META, DEMO_TEXT } from './demo';
import { loadSealFont, sealOverlaysFor, type SealSpec } from './seal';
import { highRiskChars } from './convert';
import { pageGeo } from './engine/svg';
import type { Font } from 'opentype.js';

const STORAGE_KEY = 'yinshuju-doc-v1';

class AppState {
  text = $state(DEMO_TEXT);
  meta = $state<Meta>({ ...DEMO_META });
  themeId = $state<string>(DEFAULT_THEME_ID);
  palette = $state<Palette>({ ...THEMES[0]!.palette });
  cols = $state(10);
  charsPerCol = $state(18);
  fontId = $state<FontId>(THEMES[0]!.defaultFont);
  textureStrength = $state(0.6);
  showPunct = $state(true);
  banxinChapter = $state(false); // 篇题自动入版心
  folioStart = $state(1);
  folioNumeral = $state<'cn' | 'ar'>('cn');
  showFolio = $state(true);
  fishtailCount = $state<1 | 2>(1);
  fishtailStyle = $state<FishtailSpec['style']>('black');
  fishtailPairing = $state<FishtailSpec['pairing']>('opposed');
  convertS2T = $state(false); // 简→繁（s2t）
  s2t = $state<((s: string) => string) | null>(null); // 转换器（懒加载后填入）
  sizeLarge = $state(1.8); // **大字** 倍率
  sizeSmall = $state(0.7); // *小字* 倍率
  indentTop = $state(0); // 天头留白（字位）
  indentBottom = $state(0); // 地脚留白
  indentSym = $state(true); // 上下对称
  titleScale = $state(1.3); // 书名字号倍率（卷端题名多大于正文）
  authorScale = $state(0.85);
  pageIdx = $state(0);
  seals = $state<SealSpec[]>([]); // 默认无印——避免首访即拉 21.8MB 篆书字体
  sealFont = $state<Font | null>(null);
  uploadFont = $state<{ name: string; data: ArrayBuffer } | null>(null); // 会话级，不持久化
  private sealFontRequested = false;

  // 生效正文：开简繁则用转换结果（未就绪时暂用原文）
  private conv = $derived(this.convertS2T && this.s2t ? this.s2t : null);
  effectiveText = $derived(this.conv ? this.conv(this.text) : this.text);
  // 简繁转换同样作用于书名/著者/版心（原先只转正文）
  effectiveMeta = $derived.by(() => {
    const c = this.conv;
    if (!c) return this.meta;
    return {
      title: c(this.meta.title),
      author: c(this.meta.author),
      banxinTitle: c(this.meta.banxinTitle),
      banxinJuan: c(this.meta.banxinJuan),
    };
  });
  highRisk = $derived(this.convertS2T ? highRiskChars(this.text) : []);

  ensureSealFont() {
    if (this.sealFontRequested) return;
    this.sealFontRequested = true;
    loadSealFont().then((f) => (this.sealFont = f));
  }

  theme: Theme = $derived(
    THEMES.find((t) => t.id === this.themeId) ?? THEMES[0]!,
  );
  pages = $derived(
    layout(
      parse(this.effectiveText),
      this.effectiveMeta,
      { cols: this.cols, charsPerCol: this.charsPerCol },
      this.titleScale,
      this.authorScale,
      { top: this.indentTop, bottom: this.indentBottom },
      { small: this.sizeSmall, large: this.sizeLarge },
    ),
  );
  curIdx = $derived(Math.max(0, Math.min(this.pageIdx, this.pages.length - 1)));
  // 当前叶所在篇题（含之前页最后出现的）
  private chapterAt = $derived.by(() => {
    if (!this.banxinChapter) return undefined;
    let cur: string | undefined;
    for (let i = 0; i <= this.curIdx; i++)
      for (const c of this.pages[i]?.chapters ?? []) cur = c;
    return cur;
  });
  private renderOpts = $derived({
    banxinChapter: this.chapterAt,
    indentTop: this.indentTop,
    indentBottom: this.indentBottom,
    folioStart: this.folioStart,
    folioNumeral: this.folioNumeral,
    showFolio: this.showFolio,
    fishtail: {
      count: this.fishtailCount,
      style: this.fishtailStyle,
      pairing: this.fishtailPairing,
    },
    grid: { cols: this.cols, charsPerCol: this.charsPerCol },
    palette: this.palette,
    frameWidth: this.theme.frameWidth,
    texture: this.theme.texture && this.textureStrength > 0,
    textureStrength: this.textureStrength,
    fontFamily: fontFamily(this.fontId),
    showPunct: this.showPunct,
  });
  private sealLayer = $derived.by(() => {
    if (!this.seals.length)
      return {
        single: '',
        spread: '',
        missing: [] as { index: number; chars: string[] }[],
      };
    const base = { ...this.renderOpts };
    const single = sealOverlaysFor(
      this.seals,
      this.sealFont,
      pageGeo(base, 'single'),
      this.palette,
      fontFamily('twkai'),
    );
    const spread = sealOverlaysFor(
      this.seals,
      this.sealFont,
      pageGeo({ ...base, pageW: SPREAD_PAGE_W, pageH: BASE_PAGE_H }, 'spread'),
      this.palette,
      fontFamily('twkai'),
    );
    return { single: single.svg, spread: spread.svg, missing: single.missing };
  });
  sealMissing = $derived(this.sealLayer.missing);
  svg = $derived(
    renderPage(this.pages[this.curIdx]!, this.effectiveMeta, {
      ...this.renderOpts,
      overlays:
        this.pages[this.curIdx]!.folio === 1 ? this.sealLayer.single : '',
    }),
  );
  // 对开预览：整叶 32:28（右=当前叶，左=次叶，中央整列版心）
  svgSpread = $derived(
    renderSpread(
      this.pages[this.curIdx]!,
      this.pages[this.curIdx + 1] ?? null,
      this.effectiveMeta,
      {
        ...this.renderOpts,
        pageW: SPREAD_PAGE_W,
        pageH: BASE_PAGE_H,
        overlays:
          this.pages[this.curIdx]!.folio === 1 ? this.sealLayer.spread : '',
      },
    ),
  );

  // 持久化标量清单——restore 与 persist 共用，新增字段只改这一处
  private static SCALARS = [
    'text',
    'themeId',
    'cols',
    'charsPerCol',
    'fontId',
    'textureStrength',
    'showPunct',
    'banxinChapter',
    'convertS2T',
    'folioStart',
    'folioNumeral',
    'showFolio',
    'fishtailCount',
    'fishtailStyle',
    'fishtailPairing',
    'titleScale',
    'authorScale',
    'indentTop',
    'indentBottom',
    'indentSym',
    'sizeLarge',
    'sizeSmall',
  ] as const;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Record<string, unknown>;
        const self = this as unknown as Record<string, unknown>;
        for (const k of AppState.SCALARS)
          if (s[k] !== undefined) self[k] = s[k];
        this.meta = { ...this.meta, ...(s.meta as Partial<Meta> | undefined) };
        this.palette = {
          ...this.palette,
          ...(s.palette as Partial<Palette> | undefined),
        };
        if (Array.isArray(s.seals)) this.seals = s.seals as SealSpec[];
      }
    } catch {
      // 损坏的存档直接用默认值
    }
  }

  applyTheme(id: string) {
    const t = THEMES.find((x) => x.id === id);
    if (!t) return;
    this.themeId = id;
    this.palette = { ...t.palette };
    this.fontId = t.defaultFont;
  }

  printSvgs = $state<string[] | null>(null);

  buildPrintSvgs(): string[] {
    let chapter: string | undefined;
    return this.pages.map((pg) => {
      for (const c of pg.chapters) chapter = c;
      return renderPage(pg, this.effectiveMeta, {
        ...this.renderOpts,
        banxinChapter: this.banxinChapter ? chapter : undefined,
        overlays: pg.folio === 1 ? this.sealLayer.single : '',
      });
    });
  }

  get exportCtx() {
    const { grid: _g, ...render } = this.renderOpts;
    return {
      text: this.effectiveText,
      meta: this.effectiveMeta,
      titleScale: this.titleScale,
      authorScale: this.authorScale,
      indent: { top: this.indentTop, bottom: this.indentBottom },
      sizes: { small: this.sizeSmall, large: this.sizeLarge },
      grid: { cols: this.cols, charsPerCol: this.charsPerCol },
      render,
      fontId: this.fontId,
      seals: this.seals,
      uploadData: this.uploadFont?.data ?? null,
    };
  }

  persist() {
    const self = this as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {
      meta: this.meta,
      palette: this.palette,
      seals: this.seals,
    };
    for (const k of AppState.SCALARS) out[k] = self[k];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  }
}

export const app = new AppState();
