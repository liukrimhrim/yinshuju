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
    # 全字库正楷（政府开放授权/OFL 双授权，选 OFL：可自由子集）；兜底+印章退楷
    ('twkai', 'TW-Kai', ROOT / 'fonts-src' / 'TW-Kai-98_1.ttf'),
    # 眉批用行书/草书（Google Fonts OFL；GB 字集，繁体缺字由兜底链接住）
    ('xingshu', 'Zhi Mang Xing', ROOT / 'fonts-src' / 'xingshu.ttf'),
    ('caoshu', 'Liu Jian Mao Cao', ROOT / 'fonts-src' / 'caoshu.ttf'),
    # 辰宇落雁體：OFL 带保留字体名（辰宇落雁/Chenyuluoyan），切片＝修改版，
    # 故 family 与内部名一律改作 YSJ Xingkai；出处署名见 README
    ('xingkai', 'YSJ Xingkai', ROOT / 'fonts-src' / 'xingkai.ttf'),
]

# 需改名的字体（OFL 保留字体名条款）：fid -> 新名
RENAME = {'xingkai': 'YSJ Xingkai'}


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
        if fid in RENAME:  # 改内部名，免得修改版仍顶着保留字体名
            new = RENAME[fid]
            for rec in font['name'].names:
                if rec.nameID in (1, 3, 4, 6, 16, 18):
                    font['name'].setName(
                        new if rec.nameID != 3 else f'{new};subset',
                        rec.nameID,
                        rec.platformID,
                        rec.platEncID,
                        rec.langID,
                    )
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
