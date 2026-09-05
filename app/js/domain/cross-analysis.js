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
/** 上位に入っている対象尺度を、順位の順で返す。予告と本文が同じ判定を使うための土台。 */
function targetsInTop(rank) {
  if (!Array.isArray(rank) || rank.length === 0) return [];
  return rank
    .slice(0, UNIQUE_INTEREST_TOP_N)
    .filter((scaleId) => UNIQUE_INTEREST_SCALES.includes(scaleId));
}

export function uniqueInterest({ rank, bigFive }) {
  // 連携していない人に「性格特性からは予測できない」と言っても意味が通らない。
  if (!bigFive) return null;

  const scaleIds = targetsInTop(rank);
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

/**
 * ロック予告（F-014・T-028）。未連携の結果画面に出す。
 *
 * **出せるものがある人にだけ出す。**②（整合／不整合）はまだ無いので、いま連携して
 * 増えるのは③だけである。③が出ない人に予告を見せると、連携したあとに何も増えず、
 * 約束を破ったことになる。判定は `uniqueInterest` と同じ `targetsInTop` を通す。
 *
 * ②を入れたときは、ここも全員へ広げられる。
 */
export function lockPreview({ rank, bigFive }) {
  // 連携済みなら役目が終わっている。
  if (bigFive) return null;

  const scaleIds = targetsInTop(rank);
  if (scaleIds.length === 0) return null;

  const phrase = scaleIds
    .map((scaleId) => `${rank.indexOf(scaleId) + 1}位の「${ScaleById[scaleId].labelJa}」`)
    .join("と");

  return Object.freeze({
    scaleIds: Object.freeze(scaleIds),
    lines: Object.freeze([
      `${phrase}は、ビッグファイブの5因子とはほとんど関係が見られない領域です。`,
      "ココロパレアの結果を連携すると、性格特性からは予測できない興味として、ここを結果に加えられます。",
    ]),
  });
}
