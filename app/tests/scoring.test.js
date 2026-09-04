import test from "node:test";
import assert from "node:assert/strict";
import { ItemMaster } from "../js/data/item-master.js";
import { ScaleById } from "../js/data/scale-definitions.js";
import { SCALE_ORDER } from "../js/data/scale-order.js";
import { scoreScales } from "../js/domain/scoring.js";
import { uniformAnswers } from "./helpers.js";

test("素点は尺度ごとの項目平均で、正準順に並ぶ", () => {
  const scores = scoreScales({ items: ItemMaster, answers: uniformAnswers(4) });
  assert.deepEqual(scores.map((s) => s.scaleId), [...SCALE_ORDER]);
  for (const score of scores) {
    assert.equal(score.raw, 4);
    assert.equal(score.itemCount, ScaleById[score.scaleId].itemCount);
  }
});

test("尺度ごとの項目数が不均等でも検証を通る（ココロパレアの均等前提を置き換えた箇所）", () => {
  const counts = SCALE_ORDER.map((id) => ScaleById[id].itemCount);
  assert.ok(new Set(counts).size > 1, "ORVISは尺度ごとの項目数が不均等である前提");
  assert.doesNotThrow(() => scoreScales({ items: ItemMaster, answers: uniformAnswers(3) }));
});

test("回答が欠けている・範囲外・項目が足りない場合は例外", () => {
  const answers = uniformAnswers(3);
  const missing = { ...answers };
  delete missing[ItemMaster[0].id];
  assert.throws(() => scoreScales({ items: ItemMaster, answers: missing }), /SCORING_/);
  assert.throws(() => scoreScales({ items: ItemMaster, answers: { ...answers, [ItemMaster[0].id]: 6 } }), /SCORING_/);
  assert.throws(() => scoreScales({ items: ItemMaster.slice(1), answers }), /SCORING_/);
});
