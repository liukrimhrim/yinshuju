import { describe, it, expect } from 'vitest';
import { parse } from './parse';
import { layout } from './layout';
import { renderPage, renderSpread, toCnNum } from './svg';
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

  it('对开整叶：四边闭合、全鱼尾版心居中、容两页文字', () => {
    const pages = layout(parse('字'.repeat(8 * 18 + 5)), meta, grid);
    const svg = renderSpread(pages[0]!, pages[1]!, meta, {
      ...opts('zhusilan'),
      pageW: 1120,
      pageH: 1120,
    });
    expect(svg).toContain('viewBox="0 0 1120 1120"');
    expect(svg).toContain('<rect'); // 闭合版框
    expect(svg).not.toContain('clip-path="url(#pc)"'); // 全鱼尾不裁剪
    expect(svg).toContain('>鬼<'); // 右半叶书名列
    expect(svg).toContain('>字<'); // 正文
  });

  it('自定义页面尺寸进 viewBox', () => {
    const svg = renderPage(page, meta, {
      ...opts('zhusilan'),
      pageW: 517,
      pageH: 1120,
    });
    expect(svg).toContain('viewBox="0 0 517 1120"');
  });

  it('正文不贴版框：首列末字与框线之间留白（含粗框做旧主题）', () => {
    for (const theme of ['zhusilan', 'zuojiu']) {
      const o = opts(theme);
      const svg = renderPage(page, meta, o);
      // 版框右缘 x（rect/path 的最大 x）与正文首列字的 x + 半字宽比较
      const glyphs = [
        ...svg.matchAll(
          /<text x="([\d.]+)" y="([\d.]+)" font-size="([\d.]+)"/g,
        ),
      ].map((m) => ({ x: Number(m[1]), y: Number(m[2]), fs: Number(m[3]) }));
      const maxFs = Math.max(...glyphs.map((g) => g.fs));
      const big = glyphs.filter((g) => g.fs === maxFs);
      const rightMost = Math.max(...big.map((g) => g.x));
      const topMost = Math.min(...big.map((g) => g.y));
      const frame = /<path d="M([\d.]+),([\d.]+) H([\d.]+)/.exec(svg)!;
      const frameRight = Number(frame[3]);
      const frameTop = Number(frame[2]);
      // 字面右缘/上缘须离框线至少 3u
      expect(frameRight - (rightMost + maxFs / 2)).toBeGreaterThan(3);
      expect(topMost - maxFs / 2 - frameTop).toBeGreaterThan(3);
    }
  });

  it('单半叶：版框左缘（版心中缝）贴页面左边，余幅归订口侧', () => {
    const svg = renderPage(page, meta, opts('zhusilan'));
    const frame = /<path d="M([\d.]+),([\d.]+) H([\d.]+)/.exec(svg)!;
    expect(Number(frame[1])).toBe(0); // 折缝贴边
    // 版心（鱼尾）中线亦在 0，右半可见
    expect(svg).toMatch(/<path d="M-[\d.]+,[\d.]+ h/);
  });

  it('对开整叶：两侧对称留边（非折缝页，不贴边）', () => {
    const pages = layout(parse('字'.repeat(200)), meta, grid);
    const svg = renderSpread(pages[0]!, pages[1] ?? null, meta, {
      ...opts('zhusilan'),
      pageW: 1120,
      pageH: 1120,
    });
    const rect = /<rect x="([\d.]+)"/.exec(svg)!;
    expect(Number(rect[1])).toBeGreaterThan(10);
  });

  it('toCnNum：一位/十位/两位', () => {
    expect(toCnNum(1)).toBe('一');
    expect(toCnNum(10)).toBe('十');
    expect(toCnNum(13)).toBe('十三');
    expect(toCnNum(23)).toBe('二十三');
  });
});
