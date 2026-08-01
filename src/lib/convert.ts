// 简→繁转换（mvp-v1 文本管线）：opencc-js s2t，懒加载
// 变体定案见「简繁转换与自动句读」票：s2t（OpenCC 标准繁体），不用 s2tw/s2twp

type Converter = (s: string) => string;
let converterPromise: Promise<Converter> | null = null;

export function loadS2T(): Promise<Converter> {
  if (!converterPromise) {
    converterPromise = (async () => {
      const OpenCC = await import('opencc-js');
      return OpenCC.Converter({ from: 'cn', to: 't' });
    })().catch((e) => {
      converterPromise = null;
      throw e;
    });
  }
  return converterPromise;
}

// 一简对多繁的高危字（调研票：转换后应人工核对；此为提示用静态表）
const HIGH_RISK = '后发里面干只复历钟表志余云谷斗几征愿叶松咸淀致范采';

export function highRiskChars(src: string): { ch: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ch of src)
    if (HIGH_RISK.includes(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()].map(([ch, count]) => ({ ch, count }));
}
