import { parse } from './engine/parse';
import { layout } from './engine/layout';
import { renderPage, renderSpread, LATIN_SERIF } from './engine/svg';
import type { FishtailSpec } from './engine/svg';
import { computeLayoutPlan, ratioOf } from './engine/geometry';
import {
  THEMES,
  DEFAULT_THEME_ID,
  fontFamily,
  type FontId,
  type Palette,
  type Theme,
} from './engine/themes';
import type { GridParams, Meta } from './engine/types';
import { DEMO_META, DEMO_TEXT } from './demo';
import { loadSealFont, sealOverlaysFor, type SealSpec } from './seal';
import { deleteFont, getFont, listFonts, putFont } from './fontstore';
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
  sizeLarge = $state(1.5); // **大字** 倍率
  sizeSmall = $state(0.7); // *小字* 倍率
  indentTop = $state(0); // 天头留白（字位）
  indentBottom = $state(0); // 地脚留白
  indentSym = $state(true); // 上下对称
  chapterIndent = $state(2); // 篇题低格（字位）
  authorIndent = $state(2); // 题署距底留白（字位）
  latinFont = $state<'cjk' | 'serif'>('cjk'); // 西文字体：随汉字／西文衬线
  charFillV = $state(0.8); // 纵向：上下字距
  charFillH = $state(0.68); // 横向：字与界行的距离
  chapterScale = $state(0.85); // 篇题字号倍率（与著者同基准，行内小字方能齐平）
  titleScale = $state(1.3); // 书名字号倍率（卷端题名多大于正文）
  authorScale = $state(0.85);
  ratioId = $state('base'); // 画幅比例档：预览与导出同一口径
  customW = $state(16);
  customH = $state(28);
  pageIdx = $state(0);
  seals = $state<SealSpec[]>([]); // 默认无印——避免首访即拉 21.8MB 篆书字体
  sealFont = $state<Font | null>(null);
  // 本机字体库：目录常驻（IndexedDB），当前选中的那款才把数据取进内存
  meibiFont = $state<'auto' | FontId>('xingshu'); // 眉批字体：auto＝随正文
  meibiScale = $state(0.5);
  showMeibi = $state(true);
  uploadList = $state<{ id: string; name: string }[]>([]);
  uploadId = $state<string>(''); // 选中的上传字体；随设置持久化
  uploadFont = $state<{ name: string; data: ArrayBuffer } | null>(null);
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

  ratio = $derived(ratioOf(this.ratioId, this.customW, this.customH));
  // 画幅计划：比例决定画布尺寸、单叶/对开、以及重排后的行格
  plan = $derived(
    computeLayoutPlan(this.ratio, {
      cols: this.cols,
      charsPerCol: this.charsPerCol,
    }),
  );
  // 对开一版吃两叶，翻页步长随之
  step = $derived(this.plan.mode === 'spread' ? 2 : 1);

  theme: Theme = $derived(
    THEMES.find((t) => t.id === this.themeId) ?? THEMES[0]!,
  );
  private layoutWith = (grid: GridParams) =>
    layout(
      parse(this.effectiveText),
      this.effectiveMeta,
      grid,
      this.titleScale,
      this.authorScale,
      this.chapterScale,
      {
        top: this.indentTop,
        bottom: this.indentBottom,
        chapter: this.chapterIndent,
        author: this.authorIndent,
      },
      { small: this.sizeSmall, large: this.sizeLarge },
    );
  pages = $derived(this.layoutWith(this.plan.grid));
  curIdx = $derived.by(() => {
    const i = Math.max(0, Math.min(this.pageIdx, this.pages.length - 1));
    return i - (i % this.step);
  });
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
    authorReserve: this.authorIndent,
    latinFamily: this.latinFont === 'serif' ? LATIN_SERIF : undefined,
    charFillV: this.charFillV,
    charFillH: this.charFillH,
    folioStart: this.folioStart,
    folioNumeral: this.folioNumeral,
    showFolio: this.showFolio,
    fishtail: {
      count: this.fishtailCount,
      style: this.fishtailStyle,
      pairing: this.fishtailPairing,
    },
    grid: this.plan.grid,
    palette: this.palette,
    frameWidth: this.theme.frameWidth,
    texture: this.theme.texture && this.textureStrength > 0,
    textureStrength: this.textureStrength,
    fontFamily: fontFamily(this.fontId),
    showPunct: this.showPunct,
    meibiFamily:
      this.meibiFont === 'auto' ? undefined : fontFamily(this.meibiFont),
    meibiScale: this.meibiScale,
    showMeibi: this.showMeibi,
  });
  private sealLayer = $derived.by(() => {
    if (!this.seals.length)
      return {
        single: '',
        spread: '',
        missing: [] as { index: number; chars: string[] }[],
      };
    const at = (pageW: number, mode: 'single' | 'spread') =>
      sealOverlaysFor(
        this.seals,
        this.sealFont,
        pageGeo({ ...this.renderOpts, pageW, pageH: this.plan.pageH }, mode),
        this.palette,
        fontFamily('twkai'),
      );
    const single = at(this.plan.pageW, this.plan.mode);
    const spread = at(2 * this.plan.pageW, 'spread');
    return { single: single.svg, spread: spread.svg, missing: single.missing };
  });
  sealMissing = $derived(this.sealLayer.missing);
  svg = $derived.by(() => {
    const pg = this.pages[this.curIdx]!;
    const o = {
      ...this.renderOpts,
      pageW: this.plan.pageW,
      pageH: this.plan.pageH,
      overlays: this.curIdx === 0 ? this.sealLayer.single : '',
    };
    return this.plan.mode === 'spread'
      ? renderSpread(
          pg,
          this.pages[this.curIdx + 1] ?? null,
          this.effectiveMeta,
          o,
        )
      : renderPage(pg, this.effectiveMeta, o);
  });
  // 手动对开：两个当前画幅的半叶并排（右=当前叶，左=次叶，中央整列版心）
  svgSpread = $derived(
    renderSpread(
      this.pages[this.curIdx]!,
      this.pages[this.curIdx + 1] ?? null,
      this.effectiveMeta,
      {
        ...this.renderOpts,
        pageW: 2 * this.plan.pageW,
        pageH: this.plan.pageH,
        overlays: this.curIdx === 0 ? this.sealLayer.spread : '',
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
    'chapterScale',
    'latinFont',
    'charFillV',
    'charFillH',
    'authorScale',
    'indentTop',
    'indentBottom',
    'indentSym',
    'chapterIndent',
    'authorIndent',
    'sizeLarge',
    'sizeSmall',
    'ratioId',
    'customW',
    'customH',
    'uploadId',
    'meibiFont',
    'meibiScale',
    'showMeibi',
  ] as const;

  // 上传字体挂到同一个 family，切换即换脸——渲染与导出无需知道是哪一款
  private async wearFace(data: ArrayBuffer) {
    for (const f of [...document.fonts])
      // 换字体前摘掉上一张脸
      if (f.family === 'User Upload') document.fonts.delete(f);
    const face = new FontFace('User Upload', data);
    await face.load();
    document.fonts.add(face);
  }

  /** 开机装载字体库目录，并恢复上次选中的那款 */
  async loadFontLibrary() {
    this.uploadList = await listFonts();
    if (!this.uploadList.some((f) => f.id === this.uploadId))
      this.uploadId = '';
    if (this.uploadId)
      await this.useUploadFont(this.uploadId, this.fontId === 'upload');
    else if (this.fontId === 'upload') this.fontId = 'zhuque'; // 选中的字体已删
  }

  async addUploadFont(file: File) {
    const name = file.name.replace(/\.[^.]+$/, '');
    const rec = {
      id: `${Date.now()}-${name}`,
      name,
      data: await file.arrayBuffer(),
    };
    await putFont(rec);
    this.uploadList = await listFonts();
    await this.useUploadFont(rec.id);
  }

  /** 装载本机字体；setBody=false 时只装脸不改正文字体（供眉批单用） */
  async useUploadFont(id: string, setBody = true) {
    const rec = await getFont(id);
    if (!rec) return;
    await this.wearFace(rec.data);
    this.uploadFont = { name: rec.name, data: rec.data };
    this.uploadId = id;
    if (setBody) this.fontId = 'upload';
  }

  async removeUploadFont(id: string) {
    await deleteFont(id);
    this.uploadList = await listFonts();
    if (this.uploadId !== id) return;
    this.uploadId = '';
    this.uploadFont = null;
    this.fontId = 'zhuque';
  }

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

  // 打印出口恒为 16×28cm 原开本，按用户行格重排，不随预览画幅
  buildPrintSvgs(): string[] {
    const grid = { cols: this.cols, charsPerCol: this.charsPerCol };
    const opts = { ...this.renderOpts, grid };
    const seal = this.seals.length
      ? sealOverlaysFor(
          this.seals,
          this.sealFont,
          pageGeo(opts, 'single'),
          this.palette,
          fontFamily('twkai'),
        ).svg
      : '';
    let chapter: string | undefined;
    return this.layoutWith(grid).map((pg, i) => {
      for (const c of pg.chapters) chapter = c;
      return renderPage(pg, this.effectiveMeta, {
        ...opts,
        banxinChapter: this.banxinChapter ? chapter : undefined,
        overlays: i === 0 ? seal : '', // 只卷首半叶
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
      chapterScale: this.chapterScale,
      indent: {
        top: this.indentTop,
        bottom: this.indentBottom,
        chapter: this.chapterIndent,
        author: this.authorIndent,
      },
      sizes: { small: this.sizeSmall, large: this.sizeLarge },
      grid: { cols: this.cols, charsPerCol: this.charsPerCol },
      render,
      fontId: this.fontId,
      seals: this.seals,
      uploadData: this.uploadFont?.data ?? null,
      meibiFontId: this.meibiFont === 'auto' ? this.fontId : this.meibiFont,
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
