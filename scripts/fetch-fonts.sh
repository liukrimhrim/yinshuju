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
    curl -sL -o fonts-src/huiwen.ttf \
      "https://github.com/bosswnx/huiwenmincho-improved/raw/main/%E5%8C%AF%E6%96%87%E6%98%8E%E6%9C%9D%E9%AB%94.ttf"
  fi
fi

# 朱雀仿宋：TrionesType/zhuque v0.212（OFL 1.1）
if [ ! -f fonts-src/zhuque.ttf ]; then
  curl -sL -o fonts-src/zhuque.zip \
    "https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip"
  unzip -o -q -j fonts-src/zhuque.zip "*.ttf" -d fonts-src/
  mv fonts-src/ZhuqueFangsong-Regular.ttf fonts-src/zhuque.ttf
  rm -f fonts-src/zhuque.zip
fi

ls -la fonts-src/*.ttf
