import { ScaleById } from "../data/scale-definitions.js";
import { composeResultText } from "./result-composer.js";
import { hollandResultLines } from "./holland.js";
import { consistencyPairs, lockPreview, uniqueInterest } from "./cross-analysis.js";

/**
 * S-003の結果を、そのまま他のアプリへ貼れるプレーンテキストへ組み立てる。
 * 生回答・連携コード・URLは含めず、画面に出している結果だけを対象にする。
 */
export function composeShareResultText({ snapshot, bigFive = snapshot?.bigFive ?? null }) {
  if (!snapshot || typeof snapshot !== "object") throw new TypeError("SHARE_RESULT_INPUT_INVALID");

  const result = composeResultText({
    standardizable: snapshot.standardizable,
    rank: snapshot.rank,
    primaryTypeId: snapshot.primaryTypeId,
    alternativeTypeId: snapshot.alternativeTypeId,
  });
  const lines = [
    "シゴトソケット｜45問の詳細結果",
    "",
    "あなたの称号",
    result.title,
    result.subtitle,
    "",
    ...result.reason,
  ];

  if (result.observations.length > 0) {
    lines.push("", "回答から見えたこと");
    for (const item of result.observations) {
      lines.push(`${item.position}：${item.label}`, item.text);
    }
  }

  const holland = hollandResultLines(snapshot.rank);
  if (holland.length > 0) lines.push("", "ホランド型", ...holland);

  const consistency = consistencyPairs({ scaleScores: snapshot.scaleScores, bigFive });
  const unique = uniqueInterest({ rank: snapshot.rank, bigFive });
  const preview = lockPreview({ rank: snapshot.rank, bigFive });
  if (consistency) {
    lines.push("", "ココロパレアと合わせて見えたこと", ...consistency.preamble);
    if (consistency.noneLines) lines.push(...consistency.noneLines);
    else for (const item of consistency.items) lines.push(item.heading, ...item.lines);
    if (unique) lines.push("性格からは予測できない興味", ...unique.lines);
  } else if (preview) {
    lines.push("", "ココロパレアの結果と合わせると", ...preview.lines);
  }

  lines.push("", "8つの領域の点数");
  const order = snapshot.rank ?? snapshot.scaleScores.map(({ scaleId }) => scaleId);
  order.forEach((scaleId, index) => {
    const score = snapshot.scaleScores.find((entry) => entry.scaleId === scaleId);
    lines.push(`${snapshot.rank ? `${index + 1}位　` : ""}${ScaleById[scaleId].labelJa}　${score.raw.toFixed(1)}`);
  });

  lines.push("", ...result.notes, "この診断は医学的・心理学的な検査ではありません。");
  return lines.join("\n");
}
