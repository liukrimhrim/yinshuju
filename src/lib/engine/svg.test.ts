import { describe, it, expect } from 'vitest';
import { parse } from './parse';
import { layout } from './layout';
import { renderPage, toCnNum } from './svg';
import { THEMES } from './themes';
import type { Meta } from './types';

const meta: Meta = {
  title: '鬼谷子疏解卷第一',
  author: '戰國鬼谷子撰',
  banxinTitle: '鬼谷子',
  banxinJuan: '卷一',
};
const grid = { cols: 10, charsPerCol: 18 };
const page = layout(
  parse('# 捭闔第一\n\n粤若稽古（考察），圣人。'),
  meta,
  grid,
)[0]!;

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
    expect(renderPage(page, meta, opts('zhusilan', false))).not.toContain(
      '<circle',
    );
  });

  it('夹注字号为正文一半', () => {
    const svg = renderPage(page, meta, opts('zhusilan'));
    const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) =>
      Number(m[1]),
    );
    const max = Math.max(...sizes);
    expect(sizes).toContain(Number((max / 2).toFixed(1)));
  });

  it('纹理 seed 取内容哈希：同文同貌、异文异貌', () => {
    const a1 = renderPage(page, meta, opts('zuojiu'));
    const a2 = renderPage(page, meta, opts('zuojiu'));
    expect(a1).toBe(a2);
    const other = layout(parse('另一段文字'), meta, grid)[0]!;
    const b = renderPage(other, meta, opts('zuojiu'));
    const seedOf = (s: string) => /seed="(\d+)" result="n1"/.exec(s)?.[1];
    expect(seedOf(a1)).toBeDefined();
    expect(seedOf(a1)).not.toBe(seedOf(b));
  });

  it('做旧时夹注小字走减档滤镜组（易读性守则）', () => {
    const svg = renderPage(page, meta, opts('zuojiu'));
    const noteGroup =
      /<g filter="url\(#inkErodeNote\)">([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
    expect(noteGroup).toContain('>考<'); // 夹注字在减档组里
    const bigGroup =
      /<g filter="url\(#inkErode\)">([\s\S]*?)<\/g>/.exec(svg)?.[1] ?? '';
    expect(bigGroup).not.toContain('>考<');
    expect(bigGroup).toContain('>粤<');
  });

  it('toCnNum：一位/十位/两位', () => {
    expect(toCnNum(1)).toBe('一');
    expect(toCnNum(10)).toBe('十');
    expect(toCnNum(13)).toBe('十三');
    expect(toCnNum(23)).toBe('二十三');
  });
});
