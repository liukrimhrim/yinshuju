# 字体 unicode-range 切片（stack-v1 的"切片自托管"；fonttools 实现）
# 运行: uvx --with brotli --from fonttools python scripts/slice_fonts.py
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

css_parts: list[str] = []
for fid, family, src in FONTS:
    (OUT / fid).mkdir(parents=True, exist_ok=True)
    cps = sorted(TTFont(str(src)).getBestCmap().keys())
    chunks = [cps[i : i + CHUNK] for i in range(0, len(cps), CHUNK)]
    print(f'{fid}: {len(cps)} codepoints -> {len(chunks)} chunks')
    for n, chunk in enumerate(chunks):
        out = OUT / fid / f'{n}.woff2'
        opt = subset.Options(flavor='woff2', drop_tables=['DSIG'], hinting=False)
        font = subset.load_font(str(src), opt)
        ss = subset.Subsetter(opt)
        ss.populate(unicodes=chunk)
        ss.subset(font)
        subset.save_font(font, str(out), opt)
        ranges = ','.join(f'U+{c:X}' for c in chunk)  # 逐码位列出，稳妥且 css 可压缩
        css_parts.append(
            f"@font-face{{font-family:'{family}';src:url(/fonts/{fid}/{n}.woff2) format('woff2');"
            f'font-display:swap;unicode-range:{ranges};}}'
        )
total = sum(f.stat().st_size for fid, _, _ in FONTS for f in (OUT / fid).glob('*.woff2'))
(OUT / 'fonts.css').write_text('\n'.join(css_parts))
print(f'total woff2: {total/1e6:.1f}MB, css: {(OUT/"fonts.css").stat().st_size/1e3:.0f}KB')
