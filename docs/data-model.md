# データモデル — シゴトソケット

永続化は `localStorage` のみ。サーバー・DBを持たない。ここでの「テーブル」はJavaScriptオブジェクトの構造定義を指す。

## 1. 識別子の規約

| 種別 | 形式 | 例 |
|---|---|---|
| 尺度 | `scaleId`（英小文字） | `leadership` |
| 項目 | `orvis-<元項目番号>` | `orvis-9` |
| タイプ | `type-<scaleA>--<scaleB>`（**正準順**で並べる） | `type-creativity--erudition` |
| キャラのポーズ | `character-pose-<scaleId>` | `character-pose-creativity` |
| 小物 | `prop-<scaleId>` | `prop-erudition` |
| バッジ（ORVIS） | `badge-orvis-<scaleId>` | `badge-orvis-analysis` |
| バッジ（Big5） | `badge-bigfive-<factorId>-<high\|low>` / `badge-bigfive-balanced` | `badge-bigfive-extraversion-high` |

**正準順**（この順序を全所で使う。並べ替えない）:
`leadership` → `organization` → `altruism` → `creativity` → `analysis` → `production` → `adventure` → `erudition`

`typeId` は**順序を持たない**。上位2尺度が {analysis, leadership} なら、どちらが1位でも `type-leadership--analysis` になる。理由は §5 に記す。

## 2. 尺度マスタ（`app/js/data/scale-definitions.js`）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| scaleId | string | ○ | 上記8種のいずれか |
| labelJa | string | ○ | 画面に出す表示名（統率／段取り／支援／創造／探究／手仕事／挑戦／言葉） |
| labelEn | string | ○ | 原文名（Leadership 他） |
| hollandCode | string | ○ | 対応するHollandタイプ（表示用。判定には使わない） |
| itemCount | number | ○ | 短縮版での採用項目数 |
| order | number | ○ | 正準順の位置（1〜8） |

短縮版の採用数: 統率5／段取り4／支援6／創造6／探究4／手仕事7／挑戦6／言葉7 ＝ **45**

**表示名と原典の尺度名は別物として扱う。** 原典（ORVIS）の尺度名は Leadership / Organization / Altruism / Creativity / Analysis / Production / Adventure / Erudition で、選定リストCSVもこの日本語直訳（リーダーシップ／組織化／利他性／創造性／分析／生産／冒険／学識）を使っている。CSVの列は `scaleId` への対応付けにのみ使い、**画面に出す名前は `scale-definitions.js` の `labelJa` だけが正典**。CSVの尺度名を書き換えるとビルドが壊れる。

## 3. 項目マスタ（`app/js/data/item-master.js`・生成物）

`ORVIS短縮版45問_選定リスト.csv` から `npm run items:build` で生成する。**手書きしない。**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| itemId | string | ○ | `orvis-<元項目番号>` |
| scaleId | string | ○ | 所属尺度 |
| order | number | ○ | 出題順（1〜45）。**原版の項目番号の昇順**で決まる |
| textJa | string | ○ | 設問文（日本語・ローカライズ済み） |
| sourceLoadingCollege | number | ○ | 原論文の因子負荷量（大学生サンプル） |
| sourceLoadingCommunity | number | ○ | 原論文の因子負荷量（地域サンプル） |
| localized | boolean | ○ | 日本の文脈へ改変した項目か（3件が `true`） |

- **逆転項目は存在しない**。`reversed` フィールドを設けない
- **出題順は原版（ORVIS付録）の項目番号の昇順とし、シャッフルしない**（確定）。原版は項目1〜84が8尺度の完全なラウンドロビンで構成されており、採用45問を項目番号順に並べるだけで**隣接する2問が同じ尺度になる箇所はゼロ**。16問目までに全8尺度が登場する
- 根拠：ココロパレアもIPIP-50の原版順を維持している。独自の並べ替えアルゴリズムを持たないことで、順序が説明可能・再現可能になり、履歴比較と不具合の再現性も保たれる
- 生成スクリプトは項目番号でソートして `order` を振るだけ。シードも乱数も使わない

## 4. 回答と得点

### ResponseState（回答途中・`localStorage`）

| フィールド | 型 | 説明 |
|---|---|---|
| answers | `Record<itemId, 1..5>` | 未回答のitemIdはキーごと存在しない |
| currentIndex | number | 0〜44（何問目まで進んだか）。ココロパレアと同じフィールド名 |
| startedAt | string | ISO 8601 UTC |
| updatedAt | string | ISO 8601 UTC |

### ScaleScore

| フィールド | 型 | 説明 |
|---|---|---|
| scaleId | string | |
| raw | number | 所属項目の平均（1.00〜5.00、小数第2位まで） |
| z | number \| null | 個人内標準化後の値。判定不能時は `null` |

### ResultSnapshot（結果・`localStorage`）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| resultId | string | ○ | UUID |
| createdAt | string | ○ | ISO 8601 UTC |
| scaleScores | `ScaleScore[8]` | ○ | 正準順で固定 |
| standardizable | boolean | ○ | `false` のとき8尺度の得点差がゼロで判定不能 |
| rank | `scaleId[8]` | ○ | z降順。同値は正準順で安定ソート |
| primaryTypeId | string \| null | ○ | 判定不能時は `null` |
| alternativeTypeId | string \| null | ○ | 僅差時のみ設定（§5） |
| bigFive | `BigFiveLink` \| null | ○ | 未連携なら `null` |
| versions | object | ○ | `itemSetVersion` `scoringVersion` `typeRuleVersion` `characterManifestVersion` `cardTemplateVersion` |

### BigFiveLink（第2フェーズ）

| フィールド | 型 | 説明 |
|---|---|---|
| factors | `Record<factorId, 1.00..5.00>` | `intellectImagination` `conscientiousness` `extraversion` `agreeableness` `emotionalStability` |
| z | `Record<factorId, number>` | 5因子内で個人内標準化した値 |
| titleId | string \| null | ココロパレアの称号ID（受け取れた場合） |
| receivedAt | string | ISO 8601 UTC |
| codeVersion | string | 結果コードの版（`v1` 等） |

## 5. タイプ命名表（`app/js/data/type-definitions.js`）

`typeId` は**28件**（8尺度から2つを選ぶ組み合わせ）。

| フィールド | 型 | 説明 |
|---|---|---|
| typeId | string | `type-<a>--<b>`（正準順） |
| name | string | タイプ名（日本語の名詞句） |
| description | string[] | 2〜3文 |

**なぜ順序を持たせないか**: 1位と2位のz差はごく小さいことがあり、順序を持たせると誤差でタイプ名が別物に入れ替わる。順序なしなら1位と2位が入れ替わっても**同じタイプ名**に着地する。一方、カードの絵柄はポーズ＝1位・小物＝2位で決まるため、見た目は順序に応じて変わる（実質56通りの見え方）。**名前は安定させ、絵は表情豊かにする**という役割分担。

## 6. localStorage

キー: **`sigotosocket:v1`**（ココロパレアの `big-five-self-understanding:v1` と同じ命名思想。別オリジンなので衝突しない）

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-08-31T02:30:00Z",
  "progress": { "answers": {}, "currentPage": 1, "startedAt": "...", "updatedAt": "..." },
  "results": [ { "resultId": "...", "...": "..." } ],
  "bigFive": { "factors": {}, "titleId": null, "receivedAt": "...", "codeVersion": "v1" }
}
```

- 保持期間は無期限。設定画面から全削除できる（F-008に併設）
- `localStorage` が使えない環境（プライベートモード等）ではメモリ上のみで動作し、その旨を表示する
- `schemaVersion` 不一致の envelope は読み捨てず、**移行できないことを表示した上で保持する**（利用者のデータを黙って消さない）
- 個人を識別する情報を保存しない。氏名・メール・端末IDを持たない

## 7. 保存しないもの

- サーバー側の一切（DB・API・ログ）
- 回答内容の外部送信（LLMへも送らない。§api-design.md）
- Cookie、IndexedDB、sessionStorage
