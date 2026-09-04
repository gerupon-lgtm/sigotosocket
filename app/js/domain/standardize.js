import { SCALE_ORDER } from "../data/scale-order.js";

/**
 * 個人内標準化。母集団標準偏差（÷n）を使う。標本標準偏差（÷n-1）に変えない。
 * 変更禁止事項1: 日本人規範データが存在せず集団比較ができないため、
 * 比較の基準は本人の中に置く。式を変えると過去の結果と値が一致しなくなる。
 */
export const STANDARD_DEVIATION_EPSILON = 1e-9;

export function standardize(scaleScores) {
  if (!Array.isArray(scaleScores) || scaleScores.length !== SCALE_ORDER.length) {
    throw new TypeError("STANDARDIZE_INPUT_INVALID");
  }
  const values = scaleScores.map(({ raw }) => raw);
  if (!values.every((value) => Number.isFinite(value))) {
    throw new TypeError("STANDARDIZE_INPUT_INVALID");
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  const sd = Math.sqrt(variance);

  // 全尺度が同値だとゼロ除算になる。例外にせず「判定不能」として扱い、
  // 結果画面はレーダーと専用メッセージへ分岐する（行き止まりを作らない）。
  if (!(sd > STANDARD_DEVIATION_EPSILON)) {
    return Object.freeze({
      standardizable: false,
      mean,
      sd,
      scaleScores: Object.freeze(scaleScores.map((score) => Object.freeze({ ...score, z: null }))),
    });
  }

  return Object.freeze({
    standardizable: true,
    mean,
    sd,
    scaleScores: Object.freeze(scaleScores.map((score) =>
      Object.freeze({ ...score, z: (score.raw - mean) / sd }))),
  });
}
