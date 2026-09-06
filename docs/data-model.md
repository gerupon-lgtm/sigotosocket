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
| Big5因子バッジ | 画像IDを持たない。`factorId` と表示値から文字で組む | `extraversion` → `外向性　80` |

**正準順**（この順序を全所で使う。並べ替えない）:
`leadership` → `organization` → `altruism` → `creativity` → `analysis` → `production` → `adventure` → `erudition`

`typeId` は**順序を持たない**。上位2尺度が {analysis, leadership} なら、どちらが1位でも `type-leadership--analysis` になる。理由は §5 に記す。

連携先URLは保存データへ含めず、`appMeta.brand` に置く。通常紹介用の `siblingUrl` と、任意連携用の `siblingLinkageUrl`（ココロパレア `#/sigotosocket`）を分離し、用途を混同しない。

## 2. 尺度マスタ（`app/js/data/scale-definitions.js`）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| scaleId | string | ○ | 上記8種のいずれか |
| labelJa | string | ○ | 画面に出す表示名（統率／段取り／支援／創造／探究／手仕事／挑戦／言葉） |
| labelEn | string | ○ | 原文名（Leadership 他） |
| hollandType | string \| null | ○ | 対応するホランド型（表示用。判定には使わない）。**「言葉」だけ `null`** — 6類型に含まれない領域のため。出典と表示規則は要件定義書 §7-3（ORVIS原典 Pozzebon et al., 2009 の引用つき） |
| hollandNote | string \| null | | 型を持たない領域に添える説明。「言葉」のみ値を持つ |
| itemCount | number | ○ | 短縮版での採用項目数 |
| order | number | ○ | 正準順の位置（1〜8） |

短縮版の採用数: 統率5／段取り4／支援6／創造6／探究4／手仕事7／挑戦6／言葉7 ＝ **45**

ホランド型の対応（要件定義書 §7-3 が正典。ORVIS原典に基づく）:
統率＝企業的／段取り＝慣習的／支援＝社会的／創造＝芸術的／探究＝研究的／手仕事・挑戦＝現実的（原典が「Realisticの分割」と明記）／**言葉＝型なし**。

実装は上表どおり `hollandType` / `hollandNote` を使用する（F-024実装済み）。

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

45問目の回答後から明示確定まで、`answers` が45件の `ResponseState` を正規の完了待ち状態として保存する。完了確認では`currentIndex`が44、回答見直し中は0〜44を取り得る。この段階では `ResultSnapshot` を作らず、再訪時は45回答から完了確認を復元する。完了確認の「結果を見る」または見直し中の「回答を完了する」で結果を保存できた後にだけ `progress` を `null` にする。見直し中かどうかは画面内状態であり、保存形式と `schemaVersion` は変更しない。

T-045の「回答を破棄」も既存の`progress`だけを`null`にし、`results[]`は保持する。回答画面の文言、ボタン、ヘッダーの変更によるデータ項目・schemaVersionの追加はない。

T-046は回答中ヘッダーの外枠classと余白を開始・回答完了画面へ揃える表示修正であり、データ項目、保存内容、`schemaVersion`を変更しない。

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
| rank | `scaleId[8] \| null` | ○ | z降順。同値は正準順で安定ソート。判定不能時は `null` |
| primaryTypeId | string \| null | ○ | 判定不能時は `null` |
| alternativeTypeId | string \| null | ○ | 僅差時のみ設定（§5） |
| poseScaleId | string \| null | ○ | 1位尺度。判定不能時は `null` |
| propScaleId | string \| null | ○ | 2位尺度。判定不能時は `null` |
| bigFive | `BigFiveLink` \| null | ○ | 未連携なら `null` |
| versions | object | ○ | `appVersion` `itemSetVersion` `scoringVersion` `typeRuleVersion` `cardTemplateVersion`。現行カードは `card-template-v3` |

### BigFiveLink（第2フェーズ）

| フィールド | 型 | 説明 |
|---|---|---|
| factors | `Record<factorId, 1.00..5.00>` | `intellectImagination` `conscientiousness` `extraversion` `agreeableness` `emotionalStability` |
| z | `Record<factorId, number \| null>` | 5因子内で個人内標準化した値。全因子同値なら各値は `null` |
| titleId | `null` | v1結果コードは称号IDを運ばない。F-021をv2で実装する場合に拡張する |
| receivedAt | string | ISO 8601 UTC |
| codeVersion | string | 結果コードの版（`v1` 等） |

`bigFive` はアプリ全体で**1件だけ**保持する。新しい正常な結果コードを受け取ると、envelope直下の `bigFive` と最新 `ResultSnapshot.bigFive` を置き換える。過去の連携値を配列化せず、ココロパレア側の履歴には触れない。

受領直後にトップへ出す「受け取りました／更新しました」は永続データではない。現在の画面遷移中だけメモリ上に持ち、再読込後は表示しない。

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
  "progress": { "answers": {}, "currentIndex": 0 },
  "results": [ { "resultId": "...", "...": "..." } ],
  "bigFive": { "factors": {}, "titleId": null, "receivedAt": "...", "codeVersion": "v1" }
}
```

- 保持期間は無期限。設定画面から全削除できる（F-008に併設）
- `localStorage` が使えない環境（プライベートモード等）ではメモリ上のみで動作し、その旨を表示する
- `schemaVersion` 不一致の envelope は読み捨てず、**移行できないことを表示した上で保持する**（利用者のデータを黙って消さない）
- 個人を識別する情報を保存しない。氏名・メール・端末IDを持たない
- ココロパレアの連携結果は `bigFive` の単一スロットだけを使い、履歴や受領通知を別途保存しない

## 7. 保存しないもの

- サーバー側の一切（DB・API・ログ）
- 回答内容の外部送信（LLMへも送らない。§api-design.md）
- Cookie、IndexedDB、sessionStorage
