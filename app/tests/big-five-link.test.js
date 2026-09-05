import test from "node:test";
import assert from "node:assert/strict";
import { parseBigFiveCode, BIG_FIVE_FACTOR_ORDER } from "../js/domain/big-five-link.js";

const VALID = "v1-342288401195267";
const AT = new Date("2026-09-05T02:30:00Z");

test("因子の順はココロパレアの factor-order.js と同じ", () => {
  assert.deepEqual([...BIG_FIVE_FACTOR_ORDER], [
    "intellectImagination", "conscientiousness", "extraversion",
    "agreeableness", "emotionalStability",
  ]);
});

test("正しいコードから5因子の内部平均を取り出す", () => {
  const link = parseBigFiveCode(VALID, { now: AT });
  assert.deepEqual(link.factors, {
    intellectImagination: 3.42,
    conscientiousness: 2.88,
    extraversion: 4.01,
    agreeableness: 1.95,
    emotionalStability: 2.67,
  });
  assert.equal(link.codeVersion, "v1");
  assert.equal(link.titleId, null);
  assert.equal(link.receivedAt, "2026-09-05T02:30:00.000Z");
});

test("受け取った値は 1.00〜5.00 の内部平均として読む", () => {
  const link = parseBigFiveCode("v1-100500100500300", { now: AT });
  assert.equal(link.factors.intellectImagination, 1);
  assert.equal(link.factors.conscientiousness, 5);
});

test("版数が未知なら無視する", () => {
  assert.equal(parseBigFiveCode("v2-342288401195267", { now: AT }), null);
  assert.equal(parseBigFiveCode("342288401195267", { now: AT }), null);
});

test("桁数が15でなければ無視する", () => {
  assert.equal(parseBigFiveCode("v1-34228840119526", { now: AT }), null, "14桁");
  assert.equal(parseBigFiveCode("v1-3422884011952670", { now: AT }), null, "16桁");
});

test("値域（100〜500）を外れたら無視する", () => {
  assert.equal(parseBigFiveCode("v1-099288401195267", { now: AT }), null, "下限未満");
  assert.equal(parseBigFiveCode("v1-501288401195267", { now: AT }), null, "上限超過");
  assert.equal(parseBigFiveCode("v1-342288401195501", { now: AT }), null, "末尾が上限超過");
});

test("数字以外が混じったら無視する", () => {
  assert.equal(parseBigFiveCode("v1-34228840119526a", { now: AT }), null);
  assert.equal(parseBigFiveCode("v1-３４２２８８４０１１９５２６７", { now: AT }), null, "全角");
});

test("空・型違いでも例外を投げず null を返す", () => {
  for (const bad of ["", "v1-", null, undefined, 12345, {}, [], "#b5=v1-342288401195267"]) {
    assert.equal(parseBigFiveCode(bad, { now: AT }), null, `${JSON.stringify(bad)} で null にならない`);
  }
});

test("5因子の中で個人内標準化した z を持つ", () => {
  const link = parseBigFiveCode(VALID, { now: AT });
  const zs = BIG_FIVE_FACTOR_ORDER.map((id) => link.z[id]);
  assert.ok(zs.every(Number.isFinite), "zが数値でない");
  // 母集団標準偏差（÷n）。平均は0、二乗和の平均は1になる。
  assert.ok(Math.abs(zs.reduce((a, b) => a + b, 0)) < 1e-9, "zの平均が0でない");
  assert.ok(Math.abs((zs.reduce((a, b) => a + (b * b), 0) / zs.length) - 1) < 1e-9);
  // 値の大小関係は保たれる
  assert.ok(link.z.extraversion > link.z.intellectImagination);
  assert.ok(link.z.agreeableness < link.z.emotionalStability);
});

test("5因子が横ならびなら z は null（ゼロ除算にしない）", () => {
  const link = parseBigFiveCode("v1-300300300300300", { now: AT });
  assert.ok(link, "横ならびでも受け取りは成立する");
  for (const id of BIG_FIVE_FACTOR_ORDER) assert.equal(link.z[id], null);
});

test("フラグメントから結果コードを取り出す", async () => {
  const { readBigFiveCodeFromHash } = await import("../js/domain/big-five-link.js");
  assert.equal(readBigFiveCodeFromHash("#b5=v1-342288401195267"), "v1-342288401195267");
  assert.equal(readBigFiveCodeFromHash("#b5="), null, "空のコード");
  assert.equal(readBigFiveCodeFromHash("#/start"), null, "画面のハッシュ");
  assert.equal(readBigFiveCodeFromHash("#/result"), null);
  assert.equal(readBigFiveCodeFromHash(""), null);
  assert.equal(readBigFiveCodeFromHash(null), null);
});

test("連携のハッシュで来ても画面は #/start に落ちる（行き止まりを作らない）", async () => {
  const { resolveRoute } = await import("../js/infrastructure/router.js");
  assert.equal(resolveRoute("#b5=v1-342288401195267"), "start");
});
