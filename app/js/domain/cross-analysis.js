import { ScaleById } from "../data/scale-definitions.js";
import { BIG_FIVE_FACTOR_ORDER, BIG_FIVE_FACTOR_LABEL } from "./big-five-link.js";
import {
  CONSISTENCY_PAIRS, CONSISTENCY_PREAMBLE, CONSISTENCY_NONE, positionPhrase, echoPhrase,
} from "./cross-analysis-text.js";

/**
 * 掛け合わせの層（第2フェーズ）。②整合／不整合（F-012）と③固有性（F-013）を持つ。
 *
 * ②は**並置型**で出す（processing-design §8-1）。「特性からはこう予想されるが実際は違った」
 * とは書かない。本人の2つの事実と、原典で報告された結びつきの強さを別々に書き、
 * 両者を結ぶ推論は読み手に返す。
 *
 * §10-2 の検証ゲートは「②を出すか出さないか」ではなく「**言い切りの強さ**」を決めるものへ
 * 変えた（2026-09-05・要件定義書 v1.21）。友人サンプルで符号が再現したら残差型へ格上げしてよい。
 * 実測は `npm run sample:check`（T-035）で行う。
 *
 * ②と③は依拠するものが違う。②は「相関があること」に寄りかかるので、原典のrとその限界を必ず添える。
 * ③は「**相関がないこと**」に寄りかかるので、日本語訳や短縮で関係の強さが変わっても揺らがない。
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
 * **②が入ったので全員へ出す**（2026-09-05・要件定義書 v1.21）。②は6ペアのうち
 * 向きの出たものを拾うので、③が出ない人にも渡せるものがある。
 *
 * **件数も内容も約束しない。**連携前は相手の5因子が無く、何件出るか分からない。
 * **「判定」の語を使わない。**出典・免責画面の「判定するものではありません」と衝突する。
 *
 * 順位が無い（判定不能）ときだけ null。そのときはORVIS側のzが無く、②も③も出せない。
 */
export function lockPreview({ rank, bigFive }) {
  // 連携済みなら役目が終わっている。
  if (bigFive) return null;
  if (!Array.isArray(rank) || rank.length === 0) return null;

  const lines = [
    "ココロパレアの結果を連携すると、ORVISの原典で結びつきが報告されている6つの組み合わせを照らし合わせます。"
    + "その結果に応じて、追加の説明が出ます。",
  ];

  // ③は本人の順位に紐づけて具体的に言える。言えることが多い人から減らさない。
  const scaleIds = targetsInTop(rank);
  if (scaleIds.length > 0) {
    const phrase = scaleIds
      .map((scaleId) => `${rank.indexOf(scaleId) + 1}位の「${ScaleById[scaleId].labelJa}」`)
      .join("と");
    lines.push(`${phrase}は、ビッグファイブの5因子とはほとんど関係が見られない領域です。`
      + "性格特性からは予測できない興味として、ここも結果に加えられます。");
  }

  return Object.freeze({ scaleIds: Object.freeze(scaleIds), lines: Object.freeze(lines) });
}

/* ---- ②整合／不整合（F-012・processing-design §8） ---- */

/** 本人の中で「真ん中あたり」のものについて、向きの話をしない（§8-2）。 */
export const CONSISTENCY_MIN_Z = 0.3;

/** 提示する上限。増やすと同じ話が並び、画面が文章で埋まる。 */
export const CONSISTENCY_MAX_ITEMS = 2;

/** z の降順で1始まりの順位を返す。**同値は先に来たほうを上位にする**（実行ごとに変わらない）。 */
function positionsByZ(entries) {
  const sorted = [...entries].sort((a, b) => b.z - a.z);
  return new Map(sorted.map((entry, index) => [entry.id, index + 1]));
}

/**
 * ②整合／不整合。**該当が無くても null にしない**（変更禁止事項4）。
 * null になるのは、そもそも判定の材料が無いときだけ。
 *
 * @param {{scaleScores: {scaleId: string, z: number|null}[], bigFive: object|null}} input
 * @returns {{preamble: readonly string[], items: readonly object[],
 *   noneLines: readonly string[]|null}|null}
 */
export function consistencyPairs({ scaleScores, bigFive }) {
  if (!bigFive?.z) return null;
  if (!Array.isArray(scaleScores) || scaleScores.length === 0) return null;

  // ORVIS側が判定不能（全尺度が同値）なら z が null。5因子が全部同値のときも同じ。
  const scaleZ = new Map(scaleScores.map(({ scaleId, z }) => [scaleId, z]));
  if ([...scaleZ.values()].some((z) => !Number.isFinite(z))) return null;
  if (BIG_FIVE_FACTOR_ORDER.some((factorId) => !Number.isFinite(bigFive.z[factorId]))) return null;

  const factorPosition = positionsByZ(
    BIG_FIVE_FACTOR_ORDER.map((factorId) => ({ id: factorId, z: bigFive.z[factorId] })));
  const scalePosition = positionsByZ(
    scaleScores.map(({ scaleId, z }) => ({ id: scaleId, z })));

  const candidates = [];
  CONSISTENCY_PAIRS.forEach((pair, order) => {
    const zf = bigFive.z[pair.factorId];
    const zs = scaleZ.get(pair.scaleId);
    if (Math.abs(zf) < CONSISTENCY_MIN_Z || Math.abs(zs) < CONSISTENCY_MIN_Z) return;
    const aligned = (zf > 0) === (zs > 0);
    // 揃った＝両側ともはっきり出ている度合い／分かれた＝隔たり。
    // **順番を決めるための目安であって、指標ではない。**値そのものを画面に出さない。
    const strength = aligned ? Math.min(Math.abs(zf), Math.abs(zs)) : Math.abs(zs - zf);
    candidates.push({ pair, order, aligned, zf, strength });
  });
  candidates.sort((a, b) => b.strength - a.strength || a.order - b.order);

  // 同じ因子・同じ尺度は1回まで。intellectImagination は3ペア、leadership は2ペアに出てくる
  const picked = [];
  const usedFactors = new Set();
  const usedScales = new Set();
  for (const candidate of candidates) {
    if (picked.length >= CONSISTENCY_MAX_ITEMS) break;
    if (usedFactors.has(candidate.pair.factorId) || usedScales.has(candidate.pair.scaleId)) continue;
    picked.push(candidate);
    usedFactors.add(candidate.pair.factorId);
    usedScales.add(candidate.pair.scaleId);
  }

  const items = picked.map(({ pair, aligned, zf }) => {
    const factorLabel = BIG_FIVE_FACTOR_LABEL[pair.factorId];
    const scaleLabel = ScaleById[pair.scaleId].labelJa;
    const factorPhrase = positionPhrase(
      factorPosition.get(pair.factorId), BIG_FIVE_FACTOR_ORDER.length);
    const scalePhrase = positionPhrase(scalePosition.get(pair.scaleId), scaleScores.length);
    // 揃っていて位置づけの語まで同じなら、2文目を言い換える。同じ語を2回繰り返さない
    const second = !aligned
      ? `いっぽう「${scaleLabel}」は、8領域の中では${scalePhrase}。`
      : factorPhrase === scalePhrase
        ? `「${scaleLabel}」は、8領域の中で${echoPhrase(scalePhrase)}。`
        : `「${scaleLabel}」も、8領域の中で${scalePhrase}。`;
    const first = `${factorLabel}は、あなたの5因子の中で${factorPhrase}。${second}${pair.note}`;
    const key = aligned ? (zf > 0 ? "alignedHigh" : "alignedLow") : "crossed";
    return Object.freeze({
      factorId: pair.factorId,
      scaleId: pair.scaleId,
      aligned,
      heading: `${factorLabel} × ${scaleLabel} ― ${aligned ? "向きが揃いました" : "向きが分かれました"}`,
      lines: Object.freeze([first, pair.text[key]]),
    });
  });

  return Object.freeze({
    preamble: CONSISTENCY_PREAMBLE,
    items: Object.freeze(items),
    noneLines: items.length === 0 ? CONSISTENCY_NONE : null,
  });
}
