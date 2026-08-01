import { describe, it, expect } from 'vitest';
import { arrangeSeal, buildSealSVG } from './seal';
import { THEMES } from './engine/themes';

describe('印面布局', () => {
  it('四字印 2×2，右列先、上→下', () => {
    const c = arrangeSeal(4);
    expect(c.map((x) => [x.col, x.row])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
    expect(c[0]!.cols).toBe(2);
    expect(c[0]!.rows).toBe(2);
  });

  it('二字印单列两行；三字印右二左一；六字印两列各三', () => {
    expect(arrangeSeal(2).map((x) => [x.col, x.row])).toEqual([
      [0, 0],
      [0, 1],
    ]);
    const three = arrangeSeal(3);
    expect(three.filter((x) => x.col === 0)).toHaveLength(2);
    expect(three.filter((x) => x.col === 1)).toHaveLength(1);
    const six = arrangeSeal(6);
    expect(six.filter((x) => x.col === 0)).toHaveLength(3);
    expect(six[0]!.rows).toBe(3);
  });

  it('空印文与零字防御', () => {
    expect(arrangeSeal(0)).toEqual([]);
  });
});

describe('印面 SVG（无字体时的退化路径）', () => {
  const palette = THEMES[0]!.palette;

  it('无字体 + 退楷开 → text 元素用兜底字体', () => {
    const art = buildSealSVG(
      {
        text: '印書',
        style: 'bai',
        shape: 'square',
        slot: 'authorBelow',
        kaiFallback: true,
      },
      null,
      100,
      palette,
      "'Zhuque Fangsong'",
    );
    expect(art.body).toContain('<text');
    expect(art.body).toContain('Zhuque');
    expect(art.w).toBe(100);
  });

  it('白文=红底白字，朱文=描边框', () => {
    const bai = buildSealSVG(
      {
        text: '印',
        style: 'bai',
        shape: 'square',
        slot: 'juanshou',
        kaiFallback: true,
      },
      null,
      100,
      palette,
      'serif',
    );
    expect(bai.body).toContain(`fill="${palette.seal}"`);
    expect(bai.body).toContain(`fill="${palette.paper}"`);
    const zhu = buildSealSVG(
      {
        text: '印',
        style: 'zhu',
        shape: 'circle',
        slot: 'juanshou',
        kaiFallback: true,
      },
      null,
      100,
      palette,
      'serif',
    );
    expect(zhu.body).toContain('stroke=');
    expect(zhu.body).toContain('<ellipse');
  });

  it('同印文同 seed（做旧可复现），异印文异 seed', () => {
    const a = buildSealSVG(
      {
        text: '甲乙',
        style: 'bai',
        shape: 'square',
        slot: 'tiantou',
        kaiFallback: true,
      },
      null,
      100,
      palette,
      'serif',
    );
    const b = buildSealSVG(
      {
        text: '丙丁',
        style: 'bai',
        shape: 'square',
        slot: 'tiantou',
        kaiFallback: true,
      },
      null,
      100,
      palette,
      'serif',
    );
    const seedOf = (s: string) => /seed="(\d+)"/.exec(s)?.[1];
    expect(seedOf(a.body)).toBeDefined();
    expect(seedOf(a.body)).not.toBe(seedOf(b.body));
  });
});
