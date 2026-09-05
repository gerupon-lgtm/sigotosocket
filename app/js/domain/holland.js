import { ScaleById } from "../data/scale-definitions.js";

/**
 * ホランド型の提示（F-024）。出典と表示規則は要件定義書 §7-3。
 *
 * - 出すのは**1位の領域の型だけ**。上位2つ出すと、手仕事×挑戦は型が1つに縮み、
 *   言葉が絡む組では片方が出ないため、分岐が増える。
 * - **カードは常に1行。**結果によって情報量を変えない（決定ログ D-18）。
 * - 1位が「言葉」のとき「対応なし」とは書かない。欠落ではなく6類型の側が持っていない軸のため。
 * - **職業は提示しない。**渡すのは型名という語彙だけ。
 */

const CARD_PREFIX = "ホランド型：";
const CARD_OUTSIDE = "ホランドの6類型の外にある領域";
const SCREEN_LEAD = (type) =>
  `あなたの最も高い領域は、ホランドの職業興味理論では「${type}」にあたります。`;
const SCREEN_NOTE =
  "この6類型は職業を分類する語彙として広く使われています。気になる方はこの語で調べてみてください。";

function typeOf(scaleId) {
  const scale = ScaleById[scaleId];
  if (!scale) throw new TypeError(`HOLLAND_UNKNOWN_SCALE: ${scaleId}`);
  return scale;
}

/**
 * カードに出す1行。rank が無い（判定不能）ときは null。
 * @param {string[]|null} rank 上位から並んだ尺度ID
 */
export function hollandCardLine(rank) {
  if (!Array.isArray(rank) || rank.length === 0) return null;
  const first = typeOf(rank[0]);
  return first.hollandType ? `${CARD_PREFIX}${first.hollandType}` : CARD_OUTSIDE;
}

/**
 * 結果画面に出す文。カードより詳しく書ける。判定不能のときは空配列。
 * @returns {string[]} 段落の配列
 */
export function hollandResultLines(rank) {
  if (!Array.isArray(rank) || rank.length === 0) return [];
  const first = typeOf(rank[0]);
  if (first.hollandType) return [SCREEN_LEAD(first.hollandType), SCREEN_NOTE];

  const lines = [first.hollandNote];
  // 型を持たない領域が1位のときだけ、調べる手がかりとして2位の型を添える（結果画面のみ）
  const second = rank[1] ? typeOf(rank[1]) : null;
  if (second?.hollandType) {
    lines.push(`（参考）次に高かった「${second.labelJa}」は「${second.hollandType}」にあたります。`);
  }
  return lines;
}
