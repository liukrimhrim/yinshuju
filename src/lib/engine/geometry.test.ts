import { describe, it, expect } from 'vitest';
import { computeLayoutPlan, BASE_RATIO } from './geometry';

const grid = { cols: 10, charsPerCol: 18 };

describe('比例自适应重排', () => {
  it('原开本 16:28 保持用户行数与单叶模式', () => {
    const p = computeLayoutPlan(BASE_RATIO, grid);
    expect(p.mode).toBe('single');
    expect(p.grid.cols).toBe(10);
    expect(p.grid.charsPerCol).toBe(18);
    expect(p.pageH).toBeGreaterThan(p.pageW);
  });

  it('竖长壁纸 9:19.5：更窄 → 列数减少，每列字数不变', () => {
    const p = computeLayoutPlan(9 / 19.5, grid);
    expect(p.mode).toBe('single');
    expect(p.grid.cols).toBeLessThan(10);
    expect(p.grid.cols).toBeGreaterThanOrEqual(4);
    expect(p.grid.charsPerCol).toBe(18);
  });

  it('方形 1:1 → 对开双半叶', () => {
    const p = computeLayoutPlan(1, grid);
    expect(p.mode).toBe('spread');
    expect(p.pageW).toBe(p.pageH);
  });

  it('横长 2:1 → 对开，半叶列数适配可用宽度', () => {
    const p = computeLayoutPlan(2, grid);
    expect(p.mode).toBe('spread');
    expect(p.grid.cols).toBeGreaterThanOrEqual(10);
  });

  it('3:4 竖幅 → 单叶加宽，列数增加', () => {
    const p = computeLayoutPlan(3 / 4, grid);
    expect(p.mode).toBe('single');
    expect(p.grid.cols).toBeGreaterThan(10);
  });
});
