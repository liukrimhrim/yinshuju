import { describe, it, expect } from 'vitest';
import { parse } from './parse';

describe('markup v1 解析', () => {
  it('空行分块，# 行为篇题', () => {
    const blocks = parse('# 捭闔第一\n\n粤若稽古。');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'chapter', text: '捭闔第一' });
    expect(blocks[1]?.type).toBe('para');
  });

  it('现代标点映射句读：。！？→句，，、；：→读，其余丢弃', () => {
    const blocks = parse('天地？人、鬼「神」…');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    expect(runs).toEqual([
      { t: 'text', s: '天' },
      { t: 'text', s: '地' },
      { t: 'punct', kind: 'ju' },
      { t: 'text', s: '人' },
      { t: 'punct', kind: 'dou' },
      { t: 'text', s: '鬼' },
      { t: 'text', s: '神' },
    ]);
  });

  it('圆括号=夹注，全半角都认，注内标点转小号句读附着注字', () => {
    const blocks = parse('稽古（考察，审定。）圣人(sage)也');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    expect(runs[2]).toEqual({
      t: 'note',
      chars: [
        { ch: '考' },
        { ch: '察', punct: 'dou' },
        { ch: '审' },
        { ch: '定', punct: 'ju' },
      ],
    });
    expect(runs[5]).toEqual({
      t: 'note',
      chars: [{ ch: 's' }, { ch: 'a' }, { ch: 'g' }, { ch: 'e' }],
    });
  });

  it('未闭合括号吃到块尾，不炸', () => {
    const blocks = parse('天（注文没有闭合');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    expect(runs).toHaveLength(2);
    expect(runs[1]?.t).toBe('note');
  });

  it('空输入返回空数组', () => {
    expect(parse('')).toEqual([]);
    expect(parse('  \n\n  ')).toEqual([]);
  });

  it('半角标点也丢弃，不当正文排出', () => {
    const blocks = parse('天,地.人!鬼?神;“怪”');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    expect(runs).toEqual([
      { t: 'text', s: '天' },
      { t: 'text', s: '地' },
      { t: 'text', s: '人' },
      { t: 'text', s: '鬼' },
      { t: 'text', s: '神' },
      { t: 'text', s: '怪' },
    ]);
  });

  it('markup v2 旁线：《书名线》｛圈注｝＜点注＞［专名线］', () => {
    const blocks = parse('读《鬼谷子》者｛慎｝之＜勿＞轻［王詡］也');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    const texts = runs.filter((r) => r.t === 'text') as {
      t: 'text';
      s: string;
      mark?: string;
    }[];
    expect(texts.find((r) => r.s === '鬼')?.mark).toBe('book');
    expect(texts.find((r) => r.s === '子')?.mark).toBe('book');
    expect(texts.find((r) => r.s === '慎')?.mark).toBe('circle');
    expect(texts.find((r) => r.s === '勿')?.mark).toBe('dot');
    expect(texts.find((r) => r.s === '詡')?.mark).toBe('line');
    expect(texts.find((r) => r.s === '读')?.mark).toBeUndefined();
    expect(texts.find((r) => r.s === '也')?.mark).toBeUndefined();
  });

  it('旁线标记内的标点照常映射并附着', () => {
    const blocks = parse('《鬼谷子。》后');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    expect(runs.some((r) => r.t === 'punct' && r.kind === 'ju')).toBe(true);
  });

  it('未闭合旁线标记吃到块尾，不炸', () => {
    const blocks = parse('读《鬼谷子');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    expect(runs).toHaveLength(4);
  });

  it('markdown 字号：*小字* 与 **大字**', () => {
    const blocks = parse('正文*小注*正文**标目**尾');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    const texts = runs.filter((r) => r.t === 'text') as {
      s: string;
      size?: string;
    }[];
    expect(texts.find((r) => r.s === '小')?.size).toBe('small');
    expect(texts.find((r) => r.s === '注')?.size).toBe('small');
    expect(texts.find((r) => r.s === '标')?.size).toBe('large');
    expect(texts.find((r) => r.s === '目')?.size).toBe('large');
    expect(texts.find((r) => r.s === '尾')?.size).toBeUndefined();
    expect(texts.filter((r) => r.s === '正').every((r) => !r.size)).toBe(true);
  });

  it('未闭合字号标记吃到块尾，星号本身不入正文', () => {
    const blocks = parse('天**地人');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    const texts = runs.filter((r) => r.t === 'text') as {
      s: string;
      size?: string;
    }[];
    expect(texts.map((r) => r.s).join('')).toBe('天地人');
    expect(texts.find((r) => r.s === '地')?.size).toBe('large');
  });

  it('连续拉丁/数字合成一段（含内部点与连字符），不逐字拆散', () => {
    const blocks = parse('见 RAG 与 GPT-4.5 之说');
    const runs = blocks[0]?.type === 'para' ? blocks[0].runs : [];
    const latins = runs.filter((r) => r.t === 'latin') as { s: string }[];
    expect(latins.map((r) => r.s)).toEqual(['RAG', 'GPT-4.5']);
    const texts = runs.filter((r) => r.t === 'text') as { s: string }[];
    expect(texts.map((r) => r.s).join('')).toBe('见与之说');
  });

  it('紧邻拉丁段的半角空格被吸收，全角空格与普通半角空格保留', () => {
    const kinds = (src: string) => {
      const b = parse(src)[0];
      return b && b.type === 'para' ? b.runs.map((r) => r.t) : [];
    };
    // 中西之间手打的空格不叠加（间距由排版给）
    expect(kinds('之 RAG 與')).toEqual(['text', 'latin', 'text']);
    // 汉字之间的半角空格照旧留白
    expect(kinds('甲 乙')).toEqual(['text', 'space', 'text']);
    // 全角空格恒保留（显式留白）
    expect(kinds('之\u3000RAG')).toEqual(['text', 'space', 'latin']);
  });

  it('篇题按行判定：#行后无空行的正文不被吞', () => {
    const blocks = parse('# 上篇\n上德不德。\n\n下文');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ type: 'chapter', text: '上篇' });
    expect(blocks[1]?.type).toBe('para');
    const runs = blocks[1]?.type === 'para' ? blocks[1].runs : [];
    expect(runs[0]).toEqual({ t: 'text', s: '上' });
  });
});
