import test from "node:test";
import assert from "node:assert/strict";
import { SCALE_ORDER } from "../js/data/scale-order.js";
import { buildTypeId, rankScales, classify, TIE_THRESHOLD } from "../js/domain/type-classifier.js";

const scores = (zByScale) => SCALE_ORDER.map((scaleId) => ({ scaleId, raw: 3, z: zByScale[scaleId] ?? 0 }));

test("typeIdは順序を持たない。1位と2位が入れ替わっても同じIDになる", () => {
  assert.equal(buildTypeId("analysis", "leadership"), buildTypeId("leadership", "analysis"));
  assert.equal(buildTypeId("analysis", "leadership"), "type-leadership--analysis");
  assert.throws(() => buildTypeId("analysis", "analysis"), /TYPE_ID_SAME_SCALE/);
});

test("28通りすべてが一意に作れる", () => {
  const ids = new Set();
  for (let i = 0; i < SCALE_ORDER.length; i += 1) {
    for (let j = i + 1; j < SCALE_ORDER.length; j += 1) ids.add(buildTypeId(SCALE_ORDER[i], SCALE_ORDER[j]));
  }
  assert.equal(ids.size, 28);
});

test("同値の順位は正準順で安定する（実行ごとに変わらない）", () => {
  const flat = SCALE_ORDER.map((scaleId) => ({ scaleId, raw: 3, z: 0 }));
  assert.deepEqual(rankScales(flat), [...SCALE_ORDER]);
  assert.deepEqual(rankScales([...flat].reverse()), [...SCALE_ORDER]);
});

test("2位と3位が僅差なら代替タイプを出す", () => {
  const tie = classify({ standardizable: true, scaleScores: scores({ erudition: 2, altruism: 1, creativity: 1 }) });
  assert.equal(tie.primaryTypeId, "type-altruism--erudition");
  assert.equal(tie.alternativeTypeId, "type-creativity--erudition");

  const clear = classify({ standardizable: true, scaleScores: scores({ erudition: 2, altruism: 1, creativity: 0.5 }) });
  assert.equal(clear.alternativeTypeId, null);
});

test("僅差の境界値", () => {
  const under = classify({ standardizable: true, scaleScores: scores({ erudition: 3, altruism: 2, creativity: 2 - (TIE_THRESHOLD - 0.001) }) });
  assert.ok(under.alternativeTypeId);
  const over = classify({ standardizable: true, scaleScores: scores({ erudition: 3, altruism: 2, creativity: 2 - (TIE_THRESHOLD + 0.001) }) });
  assert.equal(over.alternativeTypeId, null);
});

test("1位と2位が同値でもtypeIdは変わらない", () => {
  const a = classify({ standardizable: true, scaleScores: scores({ leadership: 2, analysis: 2 }) });
  const b = classify({ standardizable: true, scaleScores: scores({ analysis: 2, leadership: 2 }) });
  assert.equal(a.primaryTypeId, b.primaryTypeId);
});

test("判定不能ならタイプもポーズも決めない", () => {
  const result = classify({ standardizable: false, scaleScores: [] });
  assert.equal(result.primaryTypeId, null);
  assert.equal(result.poseScaleId, null);
  assert.equal(result.rank, null);
});

test("ポーズは1位、小物は2位の尺度で決まる", () => {
  const result = classify({ standardizable: true, scaleScores: scores({ production: 3, adventure: 2 }) });
  assert.equal(result.poseScaleId, "production");
  assert.equal(result.propScaleId, "adventure");
});
