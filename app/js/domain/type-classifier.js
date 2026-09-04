import { SCALE_ORDER } from "../data/scale-order.js";

/** 僅差判定の閾値【想定】。実データを見て調整する。 */
export const TIE_THRESHOLD = 0.15;

function orderIndex(scaleId) {
  return SCALE_ORDER.indexOf(scaleId);
}

/**
 * typeId は順序を持たない。
 * 1位と2位のz差はごく小さいことがあり、順序を持たせると誤差でタイプ名が入れ替わる。
 * 正準順で並べた組み合わせにすることで、1位・2位が入れ替わっても同じ名前へ着地する。
 * 一方カードの絵柄はポーズ＝1位・小物＝2位で決まるため、見た目は順序を反映する。
 */
export function buildTypeId(scaleA, scaleB) {
  if (scaleA === scaleB) throw new TypeError("TYPE_ID_SAME_SCALE");
  const [first, second] = [scaleA, scaleB].sort((a, b) => orderIndex(a) - orderIndex(b));
  return `type-${first}--${second}`;
}

/** z降順の順位。同値は正準順で安定させる（実行ごとに順位が変わってはならない）。 */
export function rankScales(scaleScores) {
  return Object.freeze([...scaleScores]
    .sort((a, b) => (b.z - a.z) || (orderIndex(a.scaleId) - orderIndex(b.scaleId)))
    .map(({ scaleId }) => scaleId));
}

export function classify({ standardizable, scaleScores }, threshold = TIE_THRESHOLD) {
  if (!standardizable) {
    return Object.freeze({
      standardizable: false,
      rank: null,
      primaryTypeId: null,
      alternativeTypeId: null,
      poseScaleId: null,
      propScaleId: null,
    });
  }

  const rank = rankScales(scaleScores);
  const zById = new Map(scaleScores.map(({ scaleId, z }) => [scaleId, z]));
  const gap = Math.abs(zById.get(rank[1]) - zById.get(rank[2]));

  return Object.freeze({
    standardizable: true,
    rank,
    primaryTypeId: buildTypeId(rank[0], rank[1]),
    // 2位と3位が僅差なら、1つに断定せず代替タイプも提示する。
    alternativeTypeId: gap < threshold ? buildTypeId(rank[0], rank[2]) : null,
    poseScaleId: rank[0],
    propScaleId: rank[1],
  });
}
