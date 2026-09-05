import test from "node:test";
import assert from "node:assert/strict";
import { partnerBadges, badgeText, displayScore, BAND_HIGH, BAND_LOW, MAX_BADGES }
  from "../js/domain/partner-badges.js";
import { LAYOUT } from "../js/presentation/card-layout.js";
import { parseBigFiveCode } from "../js/domain/big-five-link.js";

/** 5因子の内部平均から連携を作る（順は intellect, conscient, extra, agree, emotional） */
function linkOf(...means) {
  const body = means.map((m) => String(Math.round(m * 100)).padStart(3, "0")).join("");
  return parseBigFiveCode(`v1-${body}`);
}

test("高低の境目はココロパレアと同じ（3.5以上が高、2.5以下が低）", () => {
  assert.equal(BAND_HIGH, 3.5);
  assert.equal(BAND_LOW, 2.5);
  assert.equal(MAX_BADGES, 2);
});

test("連携していなければ何も出さない", () => {
  assert.equal(partnerBadges(null), null);
});

test("高い因子・低い因子をバッジにする", () => {
  // 協調性4.2（高）／情緒安定性1.8（低）、他は中
  const badges = partnerBadges(linkOf(3.0, 3.0, 3.0, 4.2, 1.8));
  assert.equal(badges.items.length, 2);
  const byId = Object.fromEntries(badges.items.map((b) => [b.factorId, b]));
  assert.equal(byId.agreeableness.band, "high");
  assert.equal(byId.agreeableness.label, "協調性");
  assert.equal(byId.emotionalStability.band, "low");
  assert.equal(byId.emotionalStability.label, "情緒安定性");
});

test("3.0からの隔たりが大きい順に、最大2つまで", () => {
  // 5因子すべてが高低に振れている
  const badges = partnerBadges(linkOf(5.0, 1.0, 4.0, 2.0, 4.5));
  assert.equal(badges.items.length, MAX_BADGES);
  // 隔たり: intellect 2.0 / conscient 2.0 / extra 1.0 / agree 1.0 / emotional 1.5
  assert.deepEqual(badges.items.map((b) => b.factorId), ["intellectImagination", "conscientiousness"]);
});

test("隔たりが同じなら因子の並び順で決める（実行ごとに変わらない）", () => {
  const a = partnerBadges(linkOf(4.0, 4.0, 3.0, 3.0, 3.0));
  const b = partnerBadges(linkOf(4.0, 4.0, 3.0, 3.0, 3.0));
  assert.deepEqual(a.items.map((x) => x.factorId), b.items.map((x) => x.factorId));
  assert.deepEqual(a.items.map((x) => x.factorId), ["intellectImagination", "conscientiousness"]);
});

test("どれも中くらいならバランスを1つ出す", () => {
  const badges = partnerBadges(linkOf(3.0, 3.0, 3.0, 3.2, 2.8));
  assert.equal(badges.items.length, 1);
  assert.equal(badges.items[0].band, "balanced");
  assert.equal(badges.items[0].label, "バランス");
});

test("境目ちょうどの値の扱い（3.5は高、2.5は低）", () => {
  const high = partnerBadges(linkOf(3.5, 3.0, 3.0, 3.0, 3.0));
  assert.equal(high.items[0].band, "high");
  const low = partnerBadges(linkOf(2.5, 3.0, 3.0, 3.0, 3.0));
  assert.equal(low.items[0].band, "low");
  const middle = partnerBadges(linkOf(3.49, 3.0, 3.0, 3.0, 3.0));
  assert.equal(middle.items[0].band, "balanced");
});

test("見出しは相手アプリの結果だと分かる", () => {
  assert.equal(partnerBadges(linkOf(4.0, 3.0, 3.0, 3.0, 3.0)).heading, "ココロパレアの結果");
});

/* ---- 表示値と文字（案A・2026-09-05） ---- */

test("表示値はココロパレアのカードと同じ0〜100になる", () => {
  // あちらの displayScoreFromRational を rawMean で表した形。項目数によらず同値
  const cases = [[1.00, 0], [2.50, 38], [3.00, 50], [3.42, 61], [3.50, 63], [4.20, 80], [5.00, 100]];
  for (const [mean, expected] of cases) {
    assert.equal(displayScore(mean), expected, `平均${mean}の表示値`);
  }
});

test("バッジの文字は「因子名　表示値」。高い低いという語を出さない", () => {
  const badges = partnerBadges(linkOf(3.0, 3.0, 3.0, 4.2, 1.8));
  const texts = badges.items.map(badgeText);
  assert.deepEqual(texts, ["協調性　80", "情緒安定性　20"]);
  for (const t of texts) {
    assert.ok(!/高|低/.test(t), `評価の語が混ざっている: ${t}`);
  }
});

test("バランスのときは表示値を付けない（比べる相手がいない）", () => {
  const badges = partnerBadges(linkOf(3.0, 3.0, 3.0, 3.2, 2.8));
  assert.equal(badgeText(badges.items[0]), "バランス");
});

test("いちばん長くなる組み合わせでも帯（幅800）に収まる", () => {
  const b = LAYOUT.reservedBand.badge;
  // 和文を全角、数字を半角として概算する。card-renderer.test.js の measureText と同じ見積り
  const width = (text) => [...text]
    .reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0) * b.textSize;
  // 5因子すべてを振り切らせ、選ばれた2つの中で最長の表記を作る
  const longest = ["情緒安定性　100", "知性・想像力　100"]
    .reduce((a, c) => (width(c) > width(a) ? c : a));
  const total = (width(longest) + b.padding * 2) * MAX_BADGES + b.pillGap * (MAX_BADGES - 1);
  assert.ok(total <= LAYOUT.reservedBand.w,
    `最長の2つが帯からはみ出す: ${total.toFixed(1)} > ${LAYOUT.reservedBand.w}`);
});
