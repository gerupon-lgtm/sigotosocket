import { standardizeValues } from "./standardize.js";

/**
 * ココロパレアからの結果コードの受け取り（F-010・第2フェーズ）。仕様は `docs/api-design.md` §1。
 *
 * 受け渡しは**URLフラグメント**で行う。`#` 以降はサーバーへ送られないので、
 * 通信経路にもアクセスログにも得点が残らない。
 *
 * **不正なコードはエラーにしない。**無視して単体の結果を出す（§1-3）。
 * 連携は上乗せであって、これが無いと診断が成り立たないものではない。
 * 利用者から見れば、他アプリのコードの不備でこちらが壊れる理由がない。
 */

/** ココロパレアの `app/js/config/factor-order.js` と同順。**並べ替えない。** */
export const BIG_FIVE_FACTOR_ORDER = Object.freeze([
  "intellectImagination",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "emotionalStability",
]);

/**
 * 因子の表示名。**ココロパレアの `diagnostic-definition.js` の `displayName` と同じ表記。**
 * バッジ（F-020）と②整合／不整合（F-012）の両方が使うので、ここに1本だけ置く。
 */
export const BIG_FIVE_FACTOR_LABEL = Object.freeze({
  intellectImagination: "知性・想像力",
  conscientiousness: "勤勉性",
  extraversion: "外向性",
  agreeableness: "協調性",
  emotionalStability: "情緒安定性",
});

/** 受け取れる結果コードの版。称号IDを載せる場合は v2 として別に採番する（§1-2）。 */
export const BIG_FIVE_CODE_VERSIONS = Object.freeze(["v1"]);

const DIGITS_PER_FACTOR = 3;
const BODY_LENGTH = BIG_FIVE_FACTOR_ORDER.length * DIGITS_PER_FACTOR;
const MIN_HUNDREDS = 100;  // 内部平均 1.00
const MAX_HUNDREDS = 500;  // 内部平均 5.00

const HASH_PREFIX = "#b5=";

/**
 * URLフラグメントから結果コードを取り出す。無ければ null。
 * ルーティング用のハッシュ（`#/start` 等）とは形が違うので取り違えない。
 */
export function readBigFiveCodeFromHash(hash) {
  if (typeof hash !== "string" || !hash.startsWith(HASH_PREFIX)) return null;
  const code = hash.slice(HASH_PREFIX.length);
  return code.length > 0 ? code : null;
}

/**
 * 結果コードを `BigFiveLink` にする。1つでも検証を満たさなければ null。
 * @param {unknown} code 例 `v1-342288401195267`
 * @param {{now?: Date}} options
 */
export function parseBigFiveCode(code, { now = new Date() } = {}) {
  if (typeof code !== "string") return null;

  const separator = code.indexOf("-");
  if (separator < 0) return null;
  const codeVersion = code.slice(0, separator);
  const body = code.slice(separator + 1);

  if (!BIG_FIVE_CODE_VERSIONS.includes(codeVersion)) return null;
  // 半角数字ちょうど15桁。全角数字や符号つきは受けない。
  if (body.length !== BODY_LENGTH || !/^[0-9]+$/.test(body)) return null;

  const hundreds = BIG_FIVE_FACTOR_ORDER.map((_, index) =>
    Number(body.slice(index * DIGITS_PER_FACTOR, (index + 1) * DIGITS_PER_FACTOR)));
  if (hundreds.some((value) => value < MIN_HUNDREDS || value > MAX_HUNDREDS)) return null;

  const means = hundreds.map((value) => value / 100);
  const { z } = standardizeValues(means);

  return Object.freeze({
    factors: Object.freeze(Object.fromEntries(
      BIG_FIVE_FACTOR_ORDER.map((factorId, index) => [factorId, means[index]]))),
    z: Object.freeze(Object.fromEntries(
      BIG_FIVE_FACTOR_ORDER.map((factorId, index) => [factorId, z[index]]))),
    titleId: null,   // v1のコードは称号IDを運ばない（§1-2）
    receivedAt: new Date(now.getTime()).toISOString(),
    codeVersion,
  });
}
