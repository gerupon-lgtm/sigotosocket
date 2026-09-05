import { BIG_FIVE_FACTOR_ORDER } from "./big-five-link.js";

/**
 * 相手アプリ（ココロパレア）の結果を記号として出す（F-020・第2フェーズ）。
 *
 * **称号IDは受け取らない**（v1のコードは5因子だけを運ぶ）。そこで、受け取った
 * 内部平均から「どの因子が高い／低いか」を出す。あちらの称号を推測して
 * 作り直すのではなく、**渡された数値がそのまま言えることだけ**を言う。
 */

/**
 * 高低の境目。**ココロパレアの `factor-result.js` の `expectedBand()` と同じ値**
 * （`keyedSum >= 3.5 * itemCount` が高、`<= 2.5 * itemCount` が低）。
 * あちらを読んで確かめた。**勝手に動かすと同じ結果が違う帯に見える。**
 */
export const BAND_HIGH = 3.5;
export const BAND_LOW = 2.5;

/**
 * 出すバッジの上限。あちらの称号も最大2因子で構成される（バランス1／単一10／ペア40）
 * ので、粒度を揃える。増やすと帯に収まらなくなる。
 */
export const MAX_BADGES = 2;

const MIDDLE = 3.0;

/** ココロパレアの `diagnostic-definition.js` の `displayName` と同じ表記。 */
const FACTOR_LABEL = Object.freeze({
  intellectImagination: "知性・想像力",
  conscientiousness: "勤勉性",
  extraversion: "外向性",
  agreeableness: "協調性",
  emotionalStability: "情緒安定性",
});

/**
 * ココロパレアのカードと同じ0〜100の表示値。
 * あちらの `displayScoreFromRational` を rawMean だけで表した形で、
 * **項目数（10問でも4問でも）によらず同じ値**になることを確かめてある。
 */
export function displayScore(mean) {
  return Math.floor(((mean - 1) * 50 + 1) / 2);
}

function bandOf(mean) {
  if (mean >= BAND_HIGH) return "high";
  if (mean <= BAND_LOW) return "low";
  return "middle";
}

/**
 * @param {{factors: Record<string, number>}|null} bigFive
 * @returns {{heading: string, items: {factorId: string|null, label: string,
 *   band: "high"|"low"|"balanced", score?: number}[]}|null}
 *   `score` は high / low のときだけ付く。文字に起こすのは `badgeText()` の役目。
 */
export function partnerBadges(bigFive) {
  if (!bigFive?.factors) return null;

  const standout = BIG_FIVE_FACTOR_ORDER
    .map((factorId) => ({
      factorId,
      label: FACTOR_LABEL[factorId],
      band: bandOf(bigFive.factors[factorId]),
      distance: Math.abs(bigFive.factors[factorId] - MIDDLE),
    }))
    .filter((entry) => entry.band !== "middle")
    // 隔たりの大きい順。同じなら因子の並び順のまま（実行ごとに変わらない）
    .sort((a, b) => b.distance - a.distance
      || BIG_FIVE_FACTOR_ORDER.indexOf(a.factorId) - BIG_FIVE_FACTOR_ORDER.indexOf(b.factorId))
    .slice(0, MAX_BADGES)
    .map(({ factorId, label, band }) => ({
      factorId, label, band, score: displayScore(bigFive.factors[factorId]),
    }));

  const items = standout.length > 0
    ? standout
    // どれも中くらい。「何も無い」ではなく、そういう結果として出す
    : [{ factorId: null, label: "バランス", band: "balanced" }];

  return Object.freeze({ heading: "ココロパレアの結果", items: Object.freeze(items) });
}

/**
 * バッジに出す文字。**言い回しはここだけを見て決まる。**
 * 「高い／低い」は評価に読まれやすいため、ココロパレアのカードと同じ
 * 0〜100の表示値を使う（あちらも高低の語をカードに出していない）。
 */
export function badgeText(item) {
  return item.band === "balanced" ? item.label : `${item.label}　${item.score}`;
}
