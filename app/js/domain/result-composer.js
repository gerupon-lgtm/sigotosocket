import { ScaleById } from "../data/scale-definitions.js";
import { TypeById, UNDETERMINED_TEXT } from "../data/type-definitions.js";

/**
 * 結果文は、そのまま画面に出せる完成品としてアプリ側で組み立てる。
 * LLMは後段で言い回しを整えるだけで、判定も文章の骨格もここで確定させる。
 *
 * 変更禁止事項2: 集団比較の表現を出力に含めない。
 * 規範データが存在しないため「あなたの中で相対的に」以上のことは言えない。
 */
export const FORBIDDEN_PHRASES = Object.freeze([
  "平均より", "平均的に", "人より", "他人より", "多数派", "少数派",
  "苦手", "向いていない", "向いている職業", "適職",
]);

const RELATIVE_NOTE =
  "ここでの高い・低いは、あなたの8領域どうしを比べた結果です。ほかの人と比べたものではありません。";

function typeParagraph(typeId) {
  const type = TypeById[typeId];
  if (!type) throw new TypeError(`RESULT_TYPE_UNKNOWN: ${typeId}`);
  return `${type.name}。${type.lead}`;
}

export function composeResultText(classification) {
  if (!classification || typeof classification !== "object") {
    throw new TypeError("RESULT_COMPOSE_INPUT_INVALID");
  }

  if (!classification.standardizable) {
    return Object.freeze({
      headline: UNDETERMINED_TEXT.name,
      alternativeHeadline: null,
      paragraphs: Object.freeze([UNDETERMINED_TEXT.lead, UNDETERMINED_TEXT.detail]),
    });
  }

  const { rank, primaryTypeId, alternativeTypeId } = classification;
  const [first, second] = rank;
  const lowest = rank[rank.length - 1];

  const paragraphs = [typeParagraph(primaryTypeId)];
  if (alternativeTypeId) {
    paragraphs.push(
      `2位と3位の差がごくわずかだったので、もうひとつの読み方も置いておきます。${typeParagraph(alternativeTypeId)}`,
    );
  }
  paragraphs.push(
    `あなたの中でいちばん高かったのは「${ScaleById[first].labelJa}」です。${ScaleById[first].highNote}`,
  );
  paragraphs.push(
    `次に高かったのは「${ScaleById[second].labelJa}」です。${ScaleById[second].highNote}`,
  );
  paragraphs.push(
    `いちばん低かったのは「${ScaleById[lowest].labelJa}」でした。${ScaleById[lowest].lowNote}`,
  );
  paragraphs.push(RELATIVE_NOTE);

  return Object.freeze({
    headline: TypeById[primaryTypeId].name,
    alternativeHeadline: alternativeTypeId ? TypeById[alternativeTypeId].name : null,
    paragraphs: Object.freeze(paragraphs),
  });
}
