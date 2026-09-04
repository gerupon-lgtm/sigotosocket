import test from "node:test";
import assert from "node:assert/strict";
import { ItemMaster } from "../js/data/item-master.js";
import { scoreScales } from "../js/domain/scoring.js";
import { standardize } from "../js/domain/standardize.js";
import { uniformAnswers, answersWith } from "./helpers.js";

const scoresFor = (answers) => scoreScales({ items: ItemMaster, answers });

test("全項目1・全項目5・全尺度同値では判定不能になり、例外を投げない", () => {
  for (const value of [1, 3, 5]) {
    const result = standardize(scoresFor(uniformAnswers(value)));
    assert.equal(result.standardizable, false);
    assert.equal(result.sd, 0);
    assert.ok(result.scaleScores.every((s) => s.z === null));
  }
});

test("母集団標準偏差（÷n）を使う", () => {
  const answers = answersWith((item) => (item.scaleId === "adventure" ? 5 : 1));
  const scores = scoresFor(answers);
  const raws = scores.map((s) => s.raw);
  const mean = raws.reduce((a, b) => a + b, 0) / raws.length;
  const population = Math.sqrt(raws.reduce((a, b) => a + ((b - mean) ** 2), 0) / raws.length);
  const sample = Math.sqrt(raws.reduce((a, b) => a + ((b - mean) ** 2), 0) / (raws.length - 1));
  const result = standardize(scores);
  assert.ok(Math.abs(result.sd - population) < 1e-12);
  assert.ok(Math.abs(result.sd - sample) > 1e-6, "標本標準偏差に変えるとこのテストが落ちる");
});

test("z の平均はほぼ0、二乗平均はほぼ1", () => {
  const result = standardize(scoresFor(answersWith((_, i) => (i % 5) + 1)));
  const zs = result.scaleScores.map((s) => s.z);
  assert.ok(Math.abs(zs.reduce((a, b) => a + b, 0) / zs.length) < 1e-12);
  assert.ok(Math.abs((zs.reduce((a, b) => a + (b * b), 0) / zs.length) - 1) < 1e-12);
});
