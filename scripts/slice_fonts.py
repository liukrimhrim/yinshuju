# 字体 unicode-range 切片（stack-v1 的"切片自托管"；fonttools 实现）
# 运行: uvx --with brotli --from fonttools python scripts/slice_fonts.py
# 产物: public/fonts/{fid}/*.woff2 + fonts.css（页面加载用）+ manifest.json（导出内嵌用）
import json
import pathlib

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).parent.parent
OUT = ROOT / 'public' / 'fonts'
CHUNK = 800  # 每片码位数

FONTS = [
    ('huiwen', 'Huiwen Mincho', ROOT / 'fonts-src' / 'huiwen.ttf'),
    ('zhuque', 'Zhuque Fangsong', ROOT / 'fonts-src' / 'zhuque.ttf'),
]


def to_ranges(cps: list[int]) -> list[list[int]]:
    """连续码位压成 [start, end] 区间。"""
    out: list[list[int]] = []
    start = prev = cps[0]
    for c in cps[1:]:
        if c != prev + 1:
            out.append([start, prev])
            start = c
        prev = c
    out.append([start, prev])
    return out


css_parts: list[str] = []
manifest: dict = {}
for fid, family, src in FONTS:
    (OUT / fid).mkdir(parents=True, exist_ok=True)
    cps = sorted(TTFont(str(src)).getBestCmap().keys())
    chunks = [cps[i : i + CHUNK] for i in range(0, len(cps), CHUNK)]
    manifest[fid] = {'family': family, 'slices': []}
    print(f'{fid}: {len(cps)} codepoints -> {len(chunks)} chunks')
    for n, chunk in enumerate(chunks):
        out = OUT / fid / f'{n}.woff2'
        opt = subset.Options(flavor='woff2', drop_tables=['DSIG'], hinting=False)
        font = subset.load_font(str(src), opt)
        ss = subset.Subsetter(opt)
        ss.populate(unicodes=chunk)
        ss.subset(font)
        subset.save_font(font, str(out), opt)
        rngs = to_ranges(chunk)
        css_ranges = ','.join(
            f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in rngs
        )
        # 相对 URL：css 内路径相对样式表自身，任意部署 base 均可用
        css_parts.append(
            f"@font-face{{font-family:'{family}';src:url({fid}/{n}.woff2) format('woff2');"
            f'font-display:swap;unicode-range:{css_ranges};}}'
        )
        manifest[fid]['slices'].append({'file': f'{fid}/{n}.woff2', 'ranges': rngs})

(OUT / 'fonts.css').write_text('\n'.join(css_parts))
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False))
total = sum(f.stat().st_size for fid, _, _ in FONTS for f in (OUT / fid).glob('*.woff2'))
print(f'total woff2: {total/1e6:.1f}MB, css: {(OUT/"fonts.css").stat().st_size/1e3:.0f}KB')
for fid in manifest:
    assert manifest[fid]['slices'], f'{fid} slices empty!'
print('manifest slices:', {k: len(v['slices']) for k, v in manifest.items()})
