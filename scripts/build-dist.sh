#!/usr/bin/env bash
# 產生上線用的 dist/：只包含網站執行需要的檔案
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist
cp index.html match.html dist/
cp -r css js dist/
touch dist/.nojekyll

echo "dist/ 已產生："
find dist -type f | sort
