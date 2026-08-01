import { parse } from './engine/parse';
import { layout } from './engine/layout';
import { renderPage, renderSpread } from './engine/svg';
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
  pageIdx = $state(0);

  theme: Theme = $derived(
    THEMES.find((t) => t.id === this.themeId) ?? THEMES[0]!,
  );
  pages = $derived(
    layout(parse(this.text), this.meta, {
      cols: this.cols,
      charsPerCol: this.charsPerCol,
    }),
  );
  curIdx = $derived(Math.max(0, Math.min(this.pageIdx, this.pages.length - 1)));
  private renderOpts = $derived({
    grid: { cols: this.cols, charsPerCol: this.charsPerCol },
    palette: this.palette,
    frameWidth: this.theme.frameWidth,
    texture: this.theme.texture && this.textureStrength > 0,
    textureStrength: this.textureStrength,
    fontFamily: fontFamily(this.fontId),
    showPunct: this.showPunct,
  });
  svg = $derived(
    renderPage(this.pages[this.curIdx]!, this.meta, this.renderOpts),
  );
  // 对开预览：整叶 32:28（右=当前叶，左=次叶，中央整列版心）
  svgSpread = $derived(
    renderSpread(
      this.pages[this.curIdx]!,
      this.pages[this.curIdx + 1] ?? null,
      this.meta,
      { ...this.renderOpts, pageW: SPREAD_PAGE_W, pageH: BASE_PAGE_H },
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

  get exportCtx() {
    const { grid: _g, ...render } = this.renderOpts;
    return {
      text: this.text,
      meta: this.meta,
      grid: { cols: this.cols, charsPerCol: this.charsPerCol },
      render,
      fontId: this.fontId,
    };
  }

  persist() {
    const self = this as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {
      meta: this.meta,
      palette: this.palette,
    };
    for (const k of AppState.SCALARS) out[k] = self[k];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  }
}

export const app = new AppState();
