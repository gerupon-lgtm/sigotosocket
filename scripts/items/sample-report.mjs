import { ItemMaster } from "../../app/js/data/item-master.js";
import { SCALE_ORDER } from "../../app/js/data/scale-order.js";
import { ScaleById } from "../../app/js/data/scale-definitions.js";
import { BIG_FIVE_FACTOR_ORDER } from "../../app/js/domain/big-five-link.js";
import { cronbachAlpha, pearson } from "./statistics.mjs";

/**
 * 友人サンプルの実測（T-035）。processing-design §10-2・§10-3、要件定義書 §6-8。
 *
 * 出すのは2つ。
 * 1. **尺度ごとのα** — 短縮した45問がまとまりを保っているか。ORVISの回答だけで出る
 * 2. **6ペアの相関の符号** — ②層（F-012）を出してよいかの判断材料。Big5とペアの回答が要る
 *
 * **件数を隠さない。**n が小さければそう書く。数字だけを見て「再現した」と
 * 早合点しないための但し書きを、レポート側が必ず持つ。
 */

/** §8 の6ペアだけ。**増やさない**（決めごとB-2）。 */
export const SIGN_CHECK_PAIRS = Object.freeze([
  { factorId: "intellectImagination", scaleId: "creativity", reference: 0.30 },
  { factorId: "intellectImagination", scaleId: "erudition", reference: 0.34 },
  { factorId: "intellectImagination", scaleId: "leadership", reference: 0.29 },
  { factorId: "agreeableness", scaleId: "altruism", reference: 0.42 },
  { factorId: "extraversion", scaleId: "leadership", reference: 0.38 },
  { factorId: "conscientiousness", scaleId: "organization", reference: 0.20 },
].map(Object.freeze));

const SAMPLE_TARGET = 10;   // §10-2 の n=10〜20 の下限
const MIN_FOR_CORRELATION = 2;

function splitCsvLine(line) {
  return line.split(",").map((cell) => cell.trim());
}

/**
 * 回答CSVを読む。1行1人。列は respondentId・5因子（任意）・45項目。
 * **使えない行は落として、理由を返す。**1人の入力ミスで全部が無駄にならないようにする。
 */
export function parseSampleCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((line) => line.trim().length > 0);
  const problems = [];
  if (lines.length < 2) return { respondents: [], problems: ["行がありません（見出し行＋1行以上が要ります）"] };

  const columns = splitCsvLine(lines[0]);
  const indexOf = (name) => columns.indexOf(name);
  const missingItems = ItemMaster.filter((item) => indexOf(item.id) < 0).map((item) => item.id);
  if (missingItems.length > 0) {
    return { respondents: [], problems: [`項目の列が足りません: ${missingItems.join(", ")}`] };
  }

  const respondents = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const idIndex = indexOf("respondentId");
    const id = idIndex >= 0 ? (cells[idIndex] || `行${respondents.length + 1}`) : `行${respondents.length + 1}`;

    const answers = {};
    let broken = null;
    for (const item of ItemMaster) {
      const raw = cells[indexOf(item.id)];
      if (raw === undefined || raw === "") { broken = `${item.id} が空`; break; }
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 5) { broken = `${item.id} が ${raw}（1〜5の外）`; break; }
      answers[item.id] = value;
    }
    if (broken) { problems.push(`${id}: ${broken}`); continue; }

    const scaleMeans = {};
    for (const scaleId of SCALE_ORDER) {
      const values = ItemMaster.filter((item) => item.scaleId === scaleId).map((item) => answers[item.id]);
      scaleMeans[scaleId] = values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    // Big5は任意。1つでも欠けたら「ペアなし」とし、部分的に埋まった行を混ぜない。
    const factors = {};
    let complete = true;
    for (const factorId of BIG_FIVE_FACTOR_ORDER) {
      const raw = indexOf(factorId) >= 0 ? cells[indexOf(factorId)] : "";
      const value = Number(raw);
      if (raw === undefined || raw === "" || !Number.isFinite(value) || value < 1 || value > 5) { complete = false; break; }
      factors[factorId] = value;
    }

    respondents.push({ respondentId: id, answers, scaleMeans, bigFive: complete ? factors : null });
  }
  return { respondents, problems };
}

/** レポートを組み立てる。判断は人がする。ここは事実と但し書きだけを返す。 */
export function buildSampleReport(respondents) {
  const respondentCount = respondents.length;
  const paired = respondents.filter((r) => r.bigFive !== null);

  const alpha = SCALE_ORDER.map((scaleId) => {
    const items = ItemMaster.filter((item) => item.scaleId === scaleId);
    const columns = items.map((item) => respondents.map((r) => r.answers[item.id]));
    return {
      scaleId,
      labelJa: ScaleById[scaleId].labelJa,
      itemCount: items.length,
      alpha: cronbachAlpha(columns),
    };
  });

  const signCheck = SIGN_CHECK_PAIRS.map((pair) => {
    if (paired.length < MIN_FOR_CORRELATION) {
      return { ...pair, n: paired.length, r: null, verdict: "判定不能" };
    }
    const r = pearson(
      paired.map((respondent) => respondent.scaleMeans[pair.scaleId]),
      paired.map((respondent) => respondent.bigFive[pair.factorId]),
    );
    const verdict = r === null ? "判定不能" : r > 0 ? "符号が再現" : r < 0 ? "符号が逆" : "ゼロ";
    return { ...pair, n: paired.length, r, verdict };
  });

  const cautions = [];
  if (respondentCount < SAMPLE_TARGET) {
    cautions.push(`回答者が${respondentCount}人。§10-2 の目安は10〜20人で、これは傾向の目安までにとどまります`);
  }
  if (paired.length < SAMPLE_TARGET) {
    cautions.push(`Big5とペアで揃ったのは${paired.length}人。符号の再現はこの人数で断定できません`);
  }
  cautions.push("相関の値は判定に掛け合わせません。使うのは符号と大小だけです（決めごとB-2）");
  const weak = alpha.filter((a) => a.alpha !== null && a.alpha < 0.72);
  if (weak.length > 0) {
    cautions.push(`推定値（.72以上）に届かない尺度: ${weak.map((a) => a.labelJa).join("・")}`);
  }
  // ③層（固有の興味）が寄りかかっているのは手仕事と挑戦。原版の時点で項目あたりの
  // 負荷量が低い側でもある（要件定義書 §6-7）。ここが弱いなら名指しで知らせる。
  const thirdLayer = weak.filter((a) => a.scaleId === "production" || a.scaleId === "adventure");
  if (thirdLayer.length > 0) {
    cautions.push(
      `③層（固有の興味）が依拠する ${thirdLayer.map((a) => a.labelJa).join("・")} のαが低いです。`
      + `手仕事・挑戦は原版の時点で負荷量が低い側で、③の提示を控えめにする判断材料になります（要件定義書 §6-7）`,
    );
  }

  return {
    respondentCount,
    pairedCount: paired.length,
    meetsSampleTarget: respondentCount >= SAMPLE_TARGET && paired.length >= SAMPLE_TARGET,
    alpha,
    signCheck,
    cautions,
  };
}
