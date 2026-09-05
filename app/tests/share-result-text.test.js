import test from "node:test";
import assert from "node:assert/strict";
import { ItemMaster } from "../js/data/item-master.js";
import { scoreScales } from "../js/domain/scoring.js";
import { standardize } from "../js/domain/standardize.js";
import { classify } from "../js/domain/type-classifier.js";
import { createResultSnapshot } from "../js/domain/result-snapshot.js";
import { composeShareResultText } from "../js/domain/share-result-text.js";
import { parseBigFiveCode } from "../js/domain/big-five-link.js";
import { answersWith } from "./helpers.js";

const SNAPSHOT = (() => {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers: answersWith((_, i) => (i % 5) + 1) }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
})();

test("共有テキストは結果画面の称号・説明・8尺度の点数・免責を含む", () => {
  const text = composeShareResultText({ snapshot: SNAPSHOT, bigFive: null });
  assert.ok(text.includes("シゴトソケット｜45問の詳細結果"));
  assert.ok(text.includes("あなたの称号"));
  assert.ok(text.includes("回答から見えたこと"));
  assert.ok(text.includes("8つの領域の点数"));
  assert.ok(text.includes("医学的・心理学的な検査ではありません"));
  for (const score of SNAPSHOT.scaleScores) {
    assert.ok(text.includes(score.raw.toFixed(1)), `${score.scaleId} の点数が無い`);
  }
});

test("連携済みの共有テキストは掛け合わせ結果も含む", () => {
  const bigFive = parseBigFiveCode("v1-342288401195267");
  const text = composeShareResultText({ snapshot: SNAPSHOT, bigFive });
  assert.ok(text.includes("ココロパレアと合わせて見えたこと"));
  assert.ok(!text.includes("ココロパレアの結果と合わせると"), "未連携向け予告を共有している");
});

test("共有テキストにURLと回答値を含めない", () => {
  const text = composeShareResultText({ snapshot: SNAPSHOT, bigFive: null });
  assert.ok(!text.includes("http"));
  assert.ok(!text.includes("b5="));
  assert.ok(!text.includes("item-"));
});
