// 主题参数表，来源：docs/themes-v1.md（对应四组样张）

export interface Palette {
  paper: string;
  text: string;
  note: string;
  mark: string;
  frame: string;
  line: string;
  seal: string;
}

export type FontId =
  | 'zhuque'
  | 'huiwen'
  | 'twkai'
  | 'xingshu'
  | 'caoshu'
  | 'xingkai'
  | 'upload'
  | 'serif';

export interface Theme {
  id: string;
  name: string;
  palette: Palette;
  texture: boolean;
  frameWidth: number;
  defaultFont: FontId;
}

export const THEMES: readonly Theme[] = [
  {
    id: 'zhusilan',
    name: '朱丝栏',
    palette: {
      paper: '#f2ead8',
      text: '#221d18',
      note: '#221d18',
      mark: '#c0392b',
      frame: '#c0392b',
      line: '#d06a55',
      seal: '#b03227',
    },
    texture: false,
    frameWidth: 3.5,
    defaultFont: 'zhuque',
  },
  {
    id: 'qingya',
    name: '清雅素白',
    palette: {
      paper: '#faf7f0',
      text: '#2b4a7f',
      note: '#c2662a',
      mark: '#c2662a',
      frame: '#2b4a7f',
      line: '#5b76a8',
      seal: '#b03227',
    },
    texture: false,
    frameWidth: 2.8,
    defaultFont: 'zhuque',
  },
  {
    id: 'zuojiu',
    name: '仿古做旧',
    palette: {
      paper: '#ece0c6',
      text: '#26201a',
      note: '#26201a',
      mark: '#b5461f',
      frame: '#26201a',
      line: '#4a4238',
      seal: '#c8471f',
    },
    texture: true,
    frameWidth: 7.5,
    defaultFont: 'huiwen',
  },
  {
    id: 'zhuyin',
    name: '朱印本',
    palette: {
      paper: '#f6efdd',
      text: '#c73e2e',
      note: '#c73e2e',
      mark: '#c73e2e',
      frame: '#c73e2e',
      line: '#d06a55',
      seal: '#b03227',
    },
    texture: false,
    frameWidth: 2.4,
    defaultFont: 'zhuque',
  },
] as const;

export const DEFAULT_THEME_ID = 'zhusilan';

export const FONTS: readonly { id: FontId; label: string; family: string }[] = [
  { id: 'zhuque', label: '朱雀仿宋', family: "'Zhuque Fangsong'" },
  { id: 'huiwen', label: '汇文明朝', family: "'Huiwen Mincho'" },
  { id: 'twkai', label: '全字库正楷', family: "'TW-Kai'" },
  { id: 'xingshu', label: '志莽行书', family: "'Zhi Mang Xing'" },
  { id: 'caoshu', label: '刘建毛草', family: "'Liu Jian Mao Cao'" },
  { id: 'xingkai', label: '手写行楷', family: "'YSJ Xingkai'" },
  { id: 'upload', label: '上传字体', family: "'User Upload'" },
  { id: 'serif', label: '系统衬线', family: 'serif' },
] as const;

// 兜底链（字体票）：主字体 → TW-Kai（生僻字之王）→ 系统衬线
export const fontFamily = (id: FontId): string => {
  const fam = (FONTS.find((f) => f.id === id) ?? FONTS[FONTS.length - 1]!)
    .family;
  return id === 'twkai' || id === 'serif'
    ? fam + ', serif'
    : fam + ", 'TW-Kai', serif";
};
