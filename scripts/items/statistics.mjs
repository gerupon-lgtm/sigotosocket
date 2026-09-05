/**
 * 友人サンプルの実測に使う統計（T-035）。**アプリ本体からは読まない。**
 * 診断のロジックは個人内の比較だけで完結しており、ここは翻訳が妥当かを
 * 開発者が確かめるための道具。
 *
 * 分散は**母集団（÷n）**で揃える。アプリ側の個人内標準化（変更禁止事項1）と
 * 同じ流儀にして、数字の出どころで迷わないようにする。
 */

export function populationVariance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
}

/**
 * クロンバックのα。
 * @param {number[][]} itemColumns 項目ごとの回答列。すべて同じ長さ（回答者数）
 * @returns {number|null} 求められないときは null（項目が足りない／合計が動かない）
 */
export function cronbachAlpha(itemColumns) {
  const k = itemColumns.length;
  if (k < 2) return null;
  const n = itemColumns[0]?.length ?? 0;
  if (n < 2) return null;
  if (!itemColumns.every((column) => column.length === n)) return null;

  const totals = Array.from({ length: n }, (_, row) =>
    itemColumns.reduce((sum, column) => sum + column[row], 0));
  const totalVariance = populationVariance(totals);
  // 全員の合計得点が同じだと割れない。0を返すと「α=0」と読めてしまうので null。
  if (totalVariance === 0) return null;

  const itemVarianceSum = itemColumns.reduce((sum, column) => sum + populationVariance(column), 0);
  return (k / (k - 1)) * (1 - (itemVarianceSum / totalVariance));
}

/**
 * ピアソンの積率相関。**使うのは符号と大きさだけ**（変更禁止事項3）。
 * 判定に掛け合わせない。ペアを選ぶ根拠の確認にのみ用いる。
 * @returns {number|null} 片方が定数、長さ違い、2件未満のときは null
 */
export function pearson(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;

  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  if (varianceX === 0 || varianceY === 0) return null;
  return covariance / Math.sqrt(varianceX * varianceY);
}
