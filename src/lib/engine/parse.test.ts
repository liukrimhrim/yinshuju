import { describe, it, expect } from 'vitest';
import { parse } from './parse';

describe('markup v1 解析', () => {
  it('空行分块，# 行为篇题', () => {
    const blocks = parse('# 捭闔第一\n\n粤若稽古。');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'chapter', text: '捭闔第一' });
    expect(blocks[1]?.type).toBe('para');
  });

  it('现代标点映射句读：。！？→句，，、；：→读，其余丢弃', () => {
    const blocks = parse('天地？人、鬼《神》…');
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

  it('篇题按行判定：#行后无空行的正文不被吞', () => {
    const blocks = parse('# 上篇\n上德不德。\n\n下文');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: 'chapter', text: '上篇' });
    expect(blocks[1]?.type).toBe('para');
    const runs = blocks[1]?.type === 'para' ? blocks[1].runs : [];
    expect(runs[0]).toEqual({ t: 'text', s: '上' });
  });
});
