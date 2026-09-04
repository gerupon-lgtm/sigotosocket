# シゴトソケット（sigotosocket）

ORVIS短縮版45問による職業興味診断Webアプリ。

- 要件の正典: `docs/requirements/要件定義書_シゴトソケット.md`
- 実装指示: `AGENTS.md`
- 設計: `docs/`（data-model / screens / processing-design / api-design / tasks）、`基本設計サマリ.md`

## 状態

| 区分 | 状態 |
|---|---|
| MVP（ORVIS単体・カード） | 実装中 |
| 第2フェーズ（ココロパレア連携・掛け合わせ） | **未着手。着手前に要確認** |
| 第3フェーズ（履歴・IPIP-VIA） | 未着手 |

## コマンド

```bash
npm run items:build   # CSV → app/js/data/item-master.js
npm run items:check   # 項目マスタの整合検証
npm run version:check # 版数の同値検証
npm test
npm run dev
```
