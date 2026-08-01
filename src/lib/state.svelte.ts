import { parse } from './engine/parse';
import { layout } from './engine/layout';
import { renderPage } from './engine/svg';
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
  svg = $derived(
    renderPage(this.pages[this.curIdx]!, this.meta, {
      grid: { cols: this.cols, charsPerCol: this.charsPerCol },
      palette: this.palette,
      frameWidth: this.theme.frameWidth,
      texture: this.theme.texture,
      textureStrength: this.textureStrength,
      fontFamily: fontFamily(this.fontId),
      showPunct: this.showPunct,
    }),
  );

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this.text = s.text ?? this.text;
        this.meta = { ...this.meta, ...s.meta };
        this.themeId = s.themeId ?? this.themeId;
        this.palette = { ...this.palette, ...s.palette };
        this.cols = s.cols ?? this.cols;
        this.charsPerCol = s.charsPerCol ?? this.charsPerCol;
        this.fontId = s.fontId ?? this.fontId;
        this.textureStrength = s.textureStrength ?? this.textureStrength;
        this.showPunct = s.showPunct ?? this.showPunct;
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

  persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        text: this.text,
        meta: this.meta,
        themeId: this.themeId,
        palette: this.palette,
        cols: this.cols,
        charsPerCol: this.charsPerCol,
        fontId: this.fontId,
        textureStrength: this.textureStrength,
        showPunct: this.showPunct,
      }),
    );
  }
}

export const app = new AppState();
