# 觀命・識己

輸入姓名、性別、生日（國曆／農曆）與出生時間，一次算出：

- **西洋星座**、**生肖**（三合／六合／相沖、本命佛、流年太歲）、**生命靈數**
- **八字命盤**：四柱、十神、藏干、納音、十二長生、空亡、五行分布、日主強弱、喜用神、大運
- **紫微斗數**：十二宮命盤（主星亮度、生年四化、大限／流年標示）、命宮主星與身宮解說
- **姓名學**：康熙筆畫五格（天人地外總）、81 數理吉凶、三才配置、姓名與八字喜用搭配
- **袁天罡稱骨**（農民曆「幾兩重」）與稱骨歌
- **出生日農民曆**：宜忌、沖煞、彭祖百忌、胎神、建除、星宿、九星、吉神凶煞

## 使用

純靜態網頁，免安裝：直接以瀏覽器開啟 `index.html`，或啟動本機伺服器：

```bash
python -m http.server 8765
```

可用網址參數直接排盤：`?name=陳,雅婷&sex=女&date=1990-05-17&time=10:30&tab=ziwei`
（`cal=lunar&leap=1` 為農曆閏月；省略 `time` 表示時辰不詳；`tab` 可為 overview/star/bazi/ziwei/name/bone/almanac）

## 部署

- `bash scripts/build-dist.sh` 產生只含上線檔案的 `dist/`（`index.html`、`css/`、`js/`），可直接上傳到任何靜態網站空間。
- 推送到 GitHub 的 `main` 分支後，`.github/workflows/pages.yml` 會自動建置 `dist/` 並部署到 GitHub Pages。

## 結構

| 路徑 | 說明 |
| --- | --- |
| `js/calc.js` | 所有命理計算（可在 Node 測試） |
| `js/app.js` | 表單與結果渲染 |
| `js/data/texts.js` | 解說文字、81 數理、稱骨歌 |
| `js/data/strokes.js` | 康熙筆畫與簡繁對照（由 `build/gen_strokes.py` 從 Unicode Unihan 產生） |
| `js/vendor/` | [lunar-javascript](https://github.com/6tail/lunar-javascript)、[iztro](https://github.com/SylarLong/iztro) |
| `build/test.js` | Node 測試腳本：`cd build && node test.js` |

結果僅供娛樂與自我探索參考。
