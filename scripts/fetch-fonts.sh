#!/bin/sh
# 拉取字体源文件到 fonts-src/（gitignored）。已存在则跳过。
set -e
cd "$(dirname "$0")/.."
mkdir -p fonts-src

# 汇文明朝体：bosswnx/huiwenmincho-improved（CC0 修正版仓库）
if [ ! -f fonts-src/huiwen.ttf ]; then
  if [ -f proto/fonts/huiwen.ttf ]; then
    cp proto/fonts/huiwen.ttf fonts-src/huiwen.ttf
  else
    curl -sfL --retry 3 --retry-delay 5 -o fonts-src/huiwen.ttf \
      "https://github.com/bosswnx/huiwenmincho-improved/raw/main/%E5%8C%AF%E6%96%87%E6%98%8E%E6%9C%9D%E9%AB%94.ttf"
  fi
fi

# 朱雀仿宋：TrionesType/zhuque v0.212（OFL 1.1）
if [ ! -f fonts-src/zhuque.ttf ]; then
  curl -sfL --retry 3 --retry-delay 5 -o fonts-src/zhuque.zip \
    "https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip"
  unzip -o -q -j fonts-src/zhuque.zip "*.ttf" -d fonts-src/
  mv fonts-src/ZhuqueFangsong-Regular.ttf fonts-src/zhuque.ttf
  rm -f fonts-src/zhuque.zip
fi

# 全字库正楷 TW-Kai（data.gov.tw 开放数据集，双授权选 OFL 1.1）
if [ ! -f fonts-src/TW-Kai-98_1.ttf ]; then
  curl -sfL --retry 3 --retry-delay 5 -o fonts-src/Fonts_Kai.zip "https://www.cns11643.gov.tw/opendata/Fonts_Kai.zip"
  unzip -o -q -j fonts-src/Fonts_Kai.zip "*.ttf" -d fonts-src/
  rm -f fonts-src/Fonts_Kai.zip
fi

# 钟齐志莽行书 / 刘建毛草（眉批用，Google Fonts，SIL OFL 1.1；GB 字集，繁体缺字落 TW-Kai）
for gf in zhimangxing/ZhiMangXing-Regular:xingshu liujianmaocao/LiuJianMaoCao-Regular:caoshu; do
  src="${gf%%:*}"; dst="${gf##*:}"
  if [ ! -f "fonts-src/$dst.ttf" ]; then
    curl -sfL --retry 3 --retry-delay 5 -o "fonts-src/$dst.ttf" \
      "https://github.com/google/fonts/raw/main/ofl/$src.ttf"
  fi
done

# 崇羲篆體（印章用，CC-BY-ND：整包原样分发、禁改作/子集化；署名王心怡、季旭昇）
if [ ! -f fonts-src/chongxi_seal.otf ]; then
  curl -sfL --retry 3 --retry-delay 5 -o fonts-src/chongxi_seal.zip \
    "https://xiaoxue.iis.sinica.edu.tw/chongxi/files/chongxi_seal.zip"
  unzip -t -q fonts-src/chongxi_seal.zip >/dev/null
  unzip -o -q -j fonts-src/chongxi_seal.zip -d fonts-src/
  rm -f fonts-src/chongxi_seal.zip
fi
mkdir -p public/fonts/seal
cp -f fonts-src/chongxi_seal.otf public/fonts/seal/
cat > public/fonts/seal/LICENSE.txt <<'EOF'
崇羲篆體 (Chong Xi Small Seal) v1.00
作者：王心怡、季旭昇
发布：中央研究院资讯科学研究所「小学堂」 https://xiaoxue.iis.sinica.edu.tw/chongxi/
授权：CC 姓名标示-禁止改作 3.0 台湾及其后版本 (CC-BY-ND-3.0-TW-or-later)
     https://xiaoxue.iis.sinica.edu.tw/chongxi/copyright.htm

本站按授权条款原样分发本字体文件（chongxi_seal.otf），未做任何修改。
EOF

ls -la fonts-src/*.ttf fonts-src/*.otf
