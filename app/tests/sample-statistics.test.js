import test from "node:test";
import assert from "node:assert/strict";
import { cronbachAlpha, pearson, populationVariance } from "../../scripts/items/statistics.mjs";

test("母集団分散（÷n）。標本分散（÷n-1）に変えない", () => {
  // 1,2,3,4 → 平均2.5、偏差の二乗和 5、÷4 = 1.25
  assert.equal(populationVariance([1, 2, 3, 4]), 1.25);
  assert.equal(populationVariance([3, 3, 3]), 0);
});

test("完全に一致する項目のαは 1", () => {
  // 手計算: k=3, Σσ²=3.75, σ²t=11.25 → (3/2)(1 − 1/3) = 1
  const alpha = cronbachAlpha([[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]]);
  assert.ok(Math.abs(alpha - 1) < 1e-12, `α=${alpha}`);
});

test("合計得点がばらつかないとき α は null（ゼロ除算にしない）", () => {
  // 1,2,3,4 と 4,3,2,1 は合計が常に5
  assert.equal(cronbachAlpha([[1, 2, 3, 4], [4, 3, 2, 1]]), null);
});

test("項目が1つ以下、回答者が1人以下なら α は null", () => {
  assert.equal(cronbachAlpha([[1, 2, 3, 4]]), null, "項目1つ");
  assert.equal(cronbachAlpha([]), null, "項目なし");
  assert.equal(cronbachAlpha([[3], [4]]), null, "回答者1人");
});

test("ピアソン相関は符号と大きさを返す", () => {
  assert.ok(Math.abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-12, "完全な正");
  assert.ok(Math.abs(pearson([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12, "完全な負");
  const r = pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
  assert.ok(r > 0.6 && r < 0.9, `r=${r}`);
});

test("どちらかが定数なら相関は null", () => {
  assert.equal(pearson([1, 2, 3], [5, 5, 5]), null);
  assert.equal(pearson([2, 2, 2], [1, 2, 3]), null);
});

test("長さ違い・2件未満なら相関は null", () => {
  assert.equal(pearson([1, 2, 3], [1, 2]), null);
  assert.equal(pearson([1], [2]), null);
});
