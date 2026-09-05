import { ScaleById } from "../data/scale-definitions.js";

/**
 * 掛け合わせの層（第2フェーズ）。いまは③固有性（F-013）だけを持つ。
 *
 * ②整合／不整合（F-012）はここへ足す予定だが、**まだ実装しない。**
 * processing-design §10-2 が「友人サンプルで6ペアの符号が再現しなければ②層を落とす」と
 * 定めており、そのデータがまだない。閾値も決まっていない。
 * 実測は `npm run sample:check`（T-035）で行う。
 *
 * ③がその前に出せるのは、依拠するものが違うからである。②は「相関があること」に
 * 寄りかかるが、③は「**相関がないこと**」に寄りかかる。関係が無いという事実は、
 * 日本語訳や短縮で関係の強さが変わっても揺らがない。
 */

/**
 * ビッグファイブの5因子とほとんど関係が見られない尺度（processing-design §9）。
 * **増やさない。**ここを広げると③の根拠（無相関）が薄い尺度まで混ざる。
 */
export const UNIQUE_INTEREST_SCALES = Object.freeze(["production", "adventure"]);

/**
 * 何位までを「上位」とみなすか。【想定】
 * カードと称号が上位2領域で決まるので、そこに合わせる。
 * 3つ目の「上位」の定義をアプリに増やさないための選択で、実データで見直してよい。
 */
export const UNIQUE_INTEREST_TOP_N = 2;

/**
 * ③固有性。**該当が無ければ null。**無理に何かを見つけない（変更禁止事項4と同じ姿勢）。
 *
 * @param {{rank: string[]|null, bigFive: object|null}} input
 * @returns {{scaleIds: string[], lines: string[]}|null}
 */
export function uniqueInterest({ rank, bigFive }) {
  // 連携していない人に「性格特性からは予測できない」と言っても意味が通らない。
  if (!bigFive) return null;
  if (!Array.isArray(rank) || rank.length === 0) return null;

  const scaleIds = rank
    .slice(0, UNIQUE_INTEREST_TOP_N)
    .filter((scaleId) => UNIQUE_INTEREST_SCALES.includes(scaleId));
  if (scaleIds.length === 0) return null;

  const labels = scaleIds.map((scaleId) => ScaleById[scaleId].labelJa).join("と");
  return Object.freeze({
    scaleIds: Object.freeze(scaleIds),
    lines: Object.freeze([
      `${labels}は、ビッグファイブの5因子とはほとんど関係が見られない領域です。`,
      "あなたの上位に入ったこの興味は、性格特性から予測できるものではありません。"
      + "予測できないという事実そのものが、ここでの手がかりになります。",
    ]),
  });
}
