#!/bin/sh
# 字体全管线：拉源文件 → unicode-range 切片到 public/fonts/
set -e
cd "$(dirname "$0")/.."
sh scripts/fetch-fonts.sh
uvx --with brotli --from fonttools python scripts/slice_fonts.py
