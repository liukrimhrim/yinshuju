import { describe, it, expect } from 'vitest';
import { parse } from './parse';
import { layout } from './layout';
import { renderPage, toCnNum } from './svg';
import { THEMES } from './themes';
import type { Meta } from './types';

const meta: Meta = { title: '鬼谷子疏解卷第一', author: '戰國鬼谷子撰', banxinTitle: '鬼谷子', banxinJuan: '卷一' };
const grid = { cols: 10, charsPerCol: 18 };
const page = layout(parse('# 捭闔第一\n\n粤若稽古（考察），圣人。'), meta, grid)[0]!;

const opts = (themeId: string, showPunct = true) => {
  const t = THEMES.find((x) => x.id === themeId)!;
  return {
    grid,
    palette: t.palette,
    frameWidth: t.frameWidth,
    texture: t.texture,
    textureStrength: 0.6,
    fontFamily: 'serif',
    showPunct,
  };
};

describe('SVG 渲染', () => {
  it('无纹理主题：含版框/鱼尾/裁剪版心/页码，无滤镜', () => {
    const svg = renderPage(page, meta, opts('zhusilan'));
    expect(svg).toContain('<svg');
    expect(svg).toContain('clip-path="url(#pc)"');
    expect(svg).toContain('l-'); // 鱼尾 path
    expect(svg).not.toContain('feTurbulence');
    expect(svg).toContain('>一<'); // 页码 一
  });

  it('做旧主题：滤镜齐全且强度参数生效', () => {
    const svg = renderPage(page, meta, opts('zuojiu'));
    expect(svg).toContain('paperGrain');
    expect(svg).toContain('inkErodeNote'); // 小字减档滤镜
    expect(svg).toContain('scale="2.60"'); // 4.33 × 0.6
  });

  it('句读圈点可整体关闭', () => {
    expect(renderPage(page, meta, opts('zhusilan', true))).toContain('<circle');
    expect(renderPage(page, meta, opts('zhusilan', false))).not.toContain('<circle');
  });

  it('夹注字号为正文一半', () => {
    const svg = renderPage(page, meta, opts('zhusilan'));
    const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
    const max = Math.max(...sizes);
    expect(sizes).toContain(Number((max / 2).toFixed(1)));
  });

  it('toCnNum：一位/十位/两位', () => {
    expect(toCnNum(1)).toBe('一');
    expect(toCnNum(10)).toBe('十');
    expect(toCnNum(13)).toBe('十三');
    expect(toCnNum(23)).toBe('二十三');
  });
});
