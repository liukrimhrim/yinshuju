import { describe, it, expect } from 'vitest';
import { planFor, type ExportContext } from './export';
import { THEMES } from './engine/themes';
import type { SealSpec } from './seal';

const theme = THEMES[0]!;
const ctx: ExportContext = {
  text: '字'.repeat(8 * 18 * 4), // 溢出到第四半叶
  meta: {
    title: '鬼谷子疏解卷第一',
    author: '戰國鬼谷子撰',
    banxinTitle: '鬼谷子',
    banxinJuan: '卷一',
  },
  grid: { cols: 10, charsPerCol: 18 },
  render: {
    palette: theme.palette,
    frameWidth: theme.frameWidth,
    texture: false,
    textureStrength: 0,
    fontFamily: 'serif',
    showPunct: true,
  },
  fontId: 'huiwen',
  seals: [
    {
      text: '止齋',
      style: 'zhu',
      shape: 'square',
      slot: 'juanshou',
      kaiFallback: true,
    },
  ] satisfies SealSpec[],
  uploadData: null,
  titleScale: 1,
  authorScale: 0.85,
  chapterScale: 1,
  indent: { top: 0, bottom: 0 },
  sizes: { small: 0.7, large: 1.5 },
};

describe('导出组版', () => {
  // 眉批另用字体时，导出须把两套字体一并内嵌，否则换台机器看就掉字
  it('眉批字体与正文字体一并内嵌', async () => {
    const withMeibi = {
      ...ctx,
      text: '粵若稽古【筆力沉著】聖人',
      fontId: 'huiwen' as const,
      meibiFontId: 'xingshu' as const,
    };
    const { svgAt } = planFor(withMeibi, 16 / 28);
    // 组版阶段就该把眉批排进天头
    expect(svgAt(0)).toContain('筆');
    // 无眉批的文稿不该白拉眉批字体
    const plain = { ...withMeibi, text: '粵若稽古聖人' };
    expect(planFor(plain, 16 / 28).svgAt(0)).not.toContain('筆');
  });

  // 叶码改为两半叶共用后，印章不能再靠 folio===1 认卷首（那会连左半叶一起盖）
  it('印章只上卷首半叶：其余半叶（含同叶左半）无印', () => {
    const { pages, svgAt } = planFor(ctx, 16 / 28);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages[0]!.folio).toBe(pages[1]!.folio); // 同一版的两半叶
    const hasSeal = (i: number) => svgAt(i).includes('止');
    expect(hasSeal(0)).toBe(true);
    expect(hasSeal(1)).toBe(false);
    expect(hasSeal(2)).toBe(false);
  });
});
