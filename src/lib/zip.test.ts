import { describe, it, expect } from 'vitest';
import { crc32, zipStore } from './zip';

const u8 = (s: string) => new TextEncoder().encode(s);
const at = (b: Uint8Array, i: number) =>
  new DataView(b.buffer).getUint32(i, true);

describe('zip 打包', () => {
  it('CRC-32 对上标准值', () => {
    expect(crc32(u8('hello')).toString(16)).toBe('3610a686');
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('三段结构齐备：局部头、中央目录、结束记录，偏移自洽', async () => {
    const entries = [
      { name: '鬼谷子-01.png', data: u8('AAA') },
      { name: '鬼谷子-02.png', data: u8('BBBB') },
    ];
    const buf = new Uint8Array(await zipStore(entries).arrayBuffer());

    expect(at(buf, 0)).toBe(0x04034b50); // 首个局部文件头
    const end = buf.length - 22;
    expect(at(buf, end)).toBe(0x06054b50); // 结束记录在末尾（无注释）
    const dv = new DataView(buf.buffer);
    expect(dv.getUint16(end + 10, true)).toBe(2); // 条目数
    const cdOffset = dv.getUint32(end + 16, true);
    expect(at(buf, cdOffset)).toBe(0x02014b50); // 中央目录起点
    expect(dv.getUint32(end + 12, true)).toBe(end - cdOffset); // 目录长度

    // 第二项的局部头偏移指向真正的局部头
    const cd2 = cdOffset + 46 + u8(entries[0]!.name).length;
    expect(at(buf, cd2)).toBe(0x02014b50);
    expect(at(buf, dv.getUint32(cd2 + 42, true))).toBe(0x04034b50);

    // 数据未压缩，CRC 与长度如实
    expect(dv.getUint16(8, true)).toBe(0); // method = store
    expect(at(buf, 14)).toBe(crc32(entries[0]!.data));
    expect(at(buf, 18)).toBe(3);
  });
});
