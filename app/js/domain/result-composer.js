import { ScaleById } from "../data/scale-definitions.js";
import { TypeById, UNDETERMINED_TEXT } from "../data/type-definitions.js";

/**
 * 結果文はアプリ側で、そのまま画面に出せる完成品まで組み立てる。
 * LLMは後段で言い回しを整えるだけで、判定も文章の骨格もここで確定させる。
 *
 * 構成はココロパレアを踏襲する。
 *   称号 → 中立副題 → 称号理由 → 各領域の観察文 → 読み方の注記
 *
 * 変更禁止事項2: 集団比較の表現を出力に含めない。
 * 規範データが存在しないため「あなたの中で相対的に」以上のことは言えない。
 */
export const FORBIDDEN_PHRASES = Object.freeze([
  "平均より", "平均的に", "人より", "他人より", "多数派", "少数派",
  "苦手", "向いていない", "向いている職業", "適職",
]);

const READING_NOTE =
  "ここでの高い・低いは、あなたの8つの領域どうしを比べたものです。ほかの人と比べた結果ではありません。";

const TITLE_NOTE =
  "称号は結果を振り返りやすくするためのもので、心理学上の正式なタイプ名ではありません。";

function label(scaleId) {
  return ScaleById[scaleId].labelJa;
}

export function composeResultText(classification) {
  if (!classification || typeof classification !== "object") {
    throw new TypeError("RESULT_COMPOSE_INPUT_INVALID");
  }

  if (!classification.standardizable) {
    return Object.freeze({
      title: UNDETERMINED_TEXT.name,
      subtitle: UNDETERMINED_TEXT.subtitle,
      alternativeTitle: null,
      reason: Object.freeze([UNDETERMINED_TEXT.reason, UNDETERMINED_TEXT.detail]),
      observations: Object.freeze([]),
      notes: Object.freeze([READING_NOTE]),
    });
  }

  const { rank, primaryTypeId, alternativeTypeId } = classification;
  const type = TypeById[primaryTypeId];
  if (!type) throw new TypeError(`RESULT_TYPE_UNKNOWN: ${primaryTypeId}`);
  const [first, second] = rank;
  const lowest = rank[rank.length - 1];

  const reason = [
    `今回の回答では、8つの領域のうち「${label(first)}」と「${label(second)}」が高いほうに出ました。`
    + `${type.reason}この2つの並びから「${type.name}」という称号になりました。`,
  ];
  if (alternativeTypeId) {
    const alternative = TypeById[alternativeTypeId];
    reason.push(
      `ただし3番目の「${label(rank[2])}」もほとんど差がありません。`
      + `そちらを2つ目に取ると「${alternative.name}」になります。どちらの読み方もできる結果です。`,
    );
  }

  const observations = [
    { scaleId: first, position: "いちばん高かった領域", text: ScaleById[first].highNote },
    { scaleId: second, position: "次に高かった領域", text: ScaleById[second].highNote },
    { scaleId: lowest, position: "いちばん低かった領域", text: ScaleById[lowest].lowNote },
  ].map((entry) => Object.freeze({ ...entry, label: label(entry.scaleId) }));

  return Object.freeze({
    title: type.name,
    subtitle: type.subtitle,
    alternativeTitle: alternativeTypeId ? TypeById[alternativeTypeId].name : null,
    reason: Object.freeze(reason),
    observations: Object.freeze(observations),
    notes: Object.freeze([READING_NOTE, TITLE_NOTE]),
  });
}
