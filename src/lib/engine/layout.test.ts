import { describe, it, expect } from 'vitest';
import { parse } from './parse';
import { layout } from './layout';
import type { Meta, Page, PlacedChar } from './types';

const meta: Meta = {
  title: '鬼谷子疏解卷第一',
  author: '戰國鬼谷子撰',
  banxinTitle: '鬼谷子',
  banxinJuan: '卷一',
};
const grid = { cols: 10, charsPerCol: 18 };

const bigs = (p: Page): PlacedChar[] =>
  p.chars.filter((c) => c.kind === 'big' && !c.role); // 只取正文大字
const notes = (p: Page): PlacedChar[] =>
  p.chars.filter((c) => c.kind === 'note');

describe('布局引擎', () => {
  it('卷首页：列0 书名顶格、列1 著者低格、篇题列低二格、正文从下一列顶格起', () => {
    const pages = layout(parse('# 捭闔第一\n\n粤若稽古'), meta, grid);
    const p = pages[0]!;
    const title = p.chars.filter((c) => c.role === 'title');
    expect(title).toHaveLength(8);
    expect(title[0]).toMatchObject({ col: 0, half: 0 });
    const author = p.chars.filter((c) => c.role === 'author');
    expect(author[0]?.col).toBe(1);
    expect(author[0]?.half).toBeGreaterThan(0);
    const chapter = p.chars.filter((c) => c.role === 'chapter');
    expect(chapter[0]).toMatchObject({ col: 2, half: 4 });
    expect(bigs(p).find((c) => c.ch === '粤')).toMatchObject({
      col: 3,
      half: 0,
    });
  });

  it('段落提行起新列', () => {
    const pages = layout(parse('一二三\n\n四五六'), meta, grid);
    const p = pages[0]!;
    expect(bigs(p).find((c) => c.ch === '一')?.col).toBe(2);
    expect(bigs(p).find((c) => c.ch === '四')).toMatchObject({
      col: 3,
      half: 0,
    });
  });

  it('夹注偶数均分、奇数右行多一，右行先', () => {
    const even = layout(parse('字（甲乙丙丁）'), meta, grid)[0]!;
    const e = notes(even);
    expect(e.filter((c) => c.sub === 'R').map((c) => c.ch)).toEqual([
      '甲',
      '乙',
    ]);
    expect(e.filter((c) => c.sub === 'L').map((c) => c.ch)).toEqual([
      '丙',
      '丁',
    ]);

    const odd = layout(parse('字（甲乙丙丁戊）'), meta, grid)[0]!;
    const o = notes(odd);
    expect(o.filter((c) => c.sub === 'R').map((c) => c.ch)).toEqual([
      '甲',
      '乙',
      '丙',
    ]);
    expect(o.filter((c) => c.sub === 'L').map((c) => c.ch)).toEqual([
      '丁',
      '戊',
    ]);
  });

  it('注毕回单行大字，从下一整字位接排', () => {
    const p = layout(parse('字（甲乙丙）后'), meta, grid)[0]!;
    const noteMaxHalf = Math.max(...notes(p).map((c) => c.half));
    const after = bigs(p).find((c) => c.ch === '后')!;
    expect(after.half % 2).toBe(0);
    expect(after.half).toBeGreaterThan(noteMaxHalf);
  });

  it('句读附着于前一大字；夹注后的句读仍附着夹注前的大字', () => {
    const p = layout(parse('天地。稽古（注文），圣人'), meta, grid)[0]!;
    expect(bigs(p).find((c) => c.ch === '地')?.punct).toBe('ju');
    expect(bigs(p).find((c) => c.ch === '古')?.punct).toBe('dou');
  });

  it('长夹注跨列续排', () => {
    const txt = '字（' + '注'.repeat(40) + '）';
    const p = layout(parse(txt), meta, { cols: 10, charsPerCol: 4 })[0]!;
    const cols = new Set(notes(p).map((c) => c.col));
    expect(cols.size).toBeGreaterThan(1);
    expect(notes(p)).toHaveLength(40);
  });

  it('溢出分页：后续页无书名著者列，正文从列0排', () => {
    // 卷首页正文容量 = (10-2)×18 = 144；149 字 → 溢出 5 字到第二页
    const pages = layout(parse('字'.repeat(8 * 18 + 5)), meta, grid);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.folio).toBe(1);
    expect(pages[1]!.folio).toBe(2);
    expect(bigs(pages[1]!)[0]).toMatchObject({ col: 0, half: 0 });
    expect(bigs(pages[1]!)).toHaveLength(5);
  });

  it('篇题落在页尾最后一列时仍自成一列，不与正文挤', () => {
    const pages = layout(
      parse('字'.repeat(6 * 18) + '\n\n# 中篇\n\n后文'),
      meta,
      grid,
    );
    const chapterPage = pages.find((p) =>
      p.chars.some((c) => c.role === 'chapter'),
    )!;
    const chapCol = chapterPage.chars.find((c) => c.role === 'chapter')!.col;
    const bodyInSameCol = bigs(chapterPage).filter(
      (c) => c.col === chapCol && !c.role,
    );
    expect(bodyInSameCol).toHaveLength(0);
  });

  it('每字一格：大字占 2 半格且对齐偶数半格', () => {
    const p = layout(parse('甲乙丙'), meta, grid)[0]!;
    for (const c of bigs(p)) expect(c.half % 2).toBe(0);
  });
});
