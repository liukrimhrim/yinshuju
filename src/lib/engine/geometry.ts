import type { GridParams } from './types';

// 比例自适应重排（mvp-v1：每档比例重算网格，方形/横屏出对开双半叶）
// 基准：16×28cm 半叶，1cm = 40u；页高恒为 1120u，宽随比例。

export const BASE_PAGE_H = 1120;
export const BASE_RATIO = 16 / 28;
export const FRAME_H_OVER_PAGE = 0.68;
export const TOP_OVER_BOTTOM = 1.5;
export const SIDE_MARGIN_OVER_PAGE_H = 0.0477; // 基准开本左右各 53.4u
const CELL_ASPECT = 1.2; // 目标格宽:格高（10×18 基准实测）
const SPREAD_THRESHOLD = 0.9; // 宽高比 ≥ 此值 → 对开双半叶

export interface LayoutPlan {
  mode: 'single' | 'spread';
  pageW: number;
  pageH: number;
  grid: GridParams; // 适配后的行格（每半叶）
}

export function computeLayoutPlan(
  ratio: number,
  userGrid: GridParams,
): LayoutPlan {
  const pageH = BASE_PAGE_H;
  const pageW = pageH * ratio;
  const frameH = FRAME_H_OVER_PAGE * pageH;
  const frameW = pageW - 2 * SIDE_MARGIN_OVER_PAGE_H * pageH;
  const cellH = frameH / userGrid.charsPerCol;
  const targetColW = cellH * CELL_ASPECT;
  const mode = ratio >= SPREAD_THRESHOLD ? 'spread' : 'single';

  let cols: number;
  if (Math.abs(ratio - BASE_RATIO) < 1e-6) {
    cols = userGrid.cols; // 原开本尊重用户设定
  } else if (mode === 'single') {
    cols = Math.round(frameW / targetColW - 0.5); // 半列归版心
  } else {
    // 对开：版框容两组内容列 + 中央整列版心
    cols = Math.floor((frameW / targetColW - 1) / 2);
  }
  cols = Math.max(4, Math.min(20, cols));

  return {
    mode,
    pageW,
    pageH,
    grid: { cols, charsPerCol: userGrid.charsPerCol },
  };
}
