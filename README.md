# シゴトソケット（sigotosocket）

ORVIS短縮版45問による職業興味診断Webアプリ。

- 要件の正典: `docs/requirements/要件定義書_シゴトソケット.md`
- 実装指示: `AGENTS.md`
- 設計: `docs/`（data-model / screens / processing-design / api-design / tasks）、`基本設計サマリ.md`

## 状態

| 区分 | 状態 |
|---|---|
| MVP（ORVIS単体・カード） | **実装済み** |
| 第2フェーズ（ココロパレア連携・掛け合わせ） | **実装済み**。任意連携の案内・受領状態UIを含む |
| 第3フェーズ | IPIP-VIA-Rは未着手。シゴトソケット側の履歴画面は作らない方針 |

ココロパレアとの連携は必須ではない。トップと未連携結果に、既定で閉じた「連携方法」を置く。この操作から専用入口 `#/sigotosocket` へ進み、50問詳細結果画面と履歴一覧の両方から直接渡せる。受け取るのは50問詳細結果の5因子だけで、回答そのものは渡さない。連携情報は1件だけ保持し、新しく受け取ると前回分を置き換える。

45問目の回答後はココロパレアと同じ完了確認を表示する。「結果を見る」で採点・結果保存し、「回答へ戻る」で回答を見直せる。

## コマンド

```bash
npm.cmd run items:build   # CSV → app/js/data/item-master.js
npm.cmd run items:check   # 項目マスタの整合検証
npm.cmd run version:check # 版数の同値検証
npm.cmd test
npm.cmd run dev
```
