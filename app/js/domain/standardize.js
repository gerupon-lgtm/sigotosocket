import { SCALE_ORDER } from "../data/scale-order.js";

/**
 * 個人内標準化。母集団標準偏差（÷n）を使う。標本標準偏差（÷n-1）に変えない。
 * 決めごとA-1: 日本人規範データが存在せず集団比較ができないため、
 * 比較の基準は本人の中に置く。式を変えると過去の結果と値が一致しなくなる。
 */
export const STANDARD_DEVIATION_EPSILON = 1e-9;

/**
 * 数値の並びを個人内標準化する。8尺度でも5因子（ココロパレア）でも同じ式を使うため、
 * ここに1本だけ置く。**式を2か所に書かない。**片方だけ直して値が食い違うのを防ぐ。
 * ばらつきが無いときは z を null にして、ゼロ除算を起こさない。
 */
export function standardizeValues(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  const sd = Math.sqrt(variance);
  if (!(sd > STANDARD_DEVIATION_EPSILON)) {
    return { standardizable: false, mean, sd, z: values.map(() => null) };
  }
  return { standardizable: true, mean, sd, z: values.map((value) => (value - mean) / sd) };
}

export function standardize(scaleScores) {
  if (!Array.isArray(scaleScores) || scaleScores.length !== SCALE_ORDER.length) {
    throw new TypeError("STANDARDIZE_INPUT_INVALID");
  }
  const values = scaleScores.map(({ raw }) => raw);
  if (!values.every((value) => Number.isFinite(value))) {
    throw new TypeError("STANDARDIZE_INPUT_INVALID");
  }

  // 全尺度が同値だとゼロ除算になる。例外にせず「判定不能」として扱い、
  // 結果画面はレーダーと専用メッセージへ分岐する（行き止まりを作らない）。
  const { standardizable, mean, sd, z } = standardizeValues(values);

  return Object.freeze({
    standardizable,
    mean,
    sd,
    scaleScores: Object.freeze(scaleScores.map((score, index) =>
      Object.freeze({ ...score, z: z[index] }))),
  });
}
