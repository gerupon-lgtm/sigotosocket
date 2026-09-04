// 項目マスタの整合検証。生成物が壊れていないことを機械的に確かめる。
import { ItemMaster } from "../../app/js/data/item-master.js";
import { ScaleDefinitions, ScaleById } from "../../app/js/data/scale-definitions.js";
import { SCALE_ORDER } from "../../app/js/data/scale-order.js";

const problems = [];
const EXPECTED_TOTAL = ScaleDefinitions.reduce((sum, s) => sum + s.itemCount, 0);

if (ItemMaster.length !== EXPECTED_TOTAL) {
  problems.push(`件数が ${ItemMaster.length}。尺度マスタの合計 ${EXPECTED_TOTAL} と一致しない`);
}
for (const scaleId of SCALE_ORDER) {
  const actual = ItemMaster.filter((item) => item.scaleId === scaleId).length;
  if (actual !== ScaleById[scaleId].itemCount) {
    problems.push(`${scaleId}: ${actual}問。尺度マスタの ${ScaleById[scaleId].itemCount} と一致しない`);
  }
}
const ids = ItemMaster.map((item) => item.id);
if (new Set(ids).size !== ids.length) problems.push("itemId が重複している");
for (const item of ItemMaster) {
  if (!item.textJa || item.textJa.trim().length === 0) problems.push(`${item.id}: 設問文が空`);
  if (item.keyedDirection !== "positive") problems.push(`${item.id}: ORVISに逆転項目は存在しない`);
  for (const key of ["loadingCollege", "loadingCommunity"]) {
    const value = item[key];
    if (!Number.isFinite(value) || value <= 0 || value > 1) problems.push(`${item.id}: ${key} が範囲外 (${value})`);
  }
}
// 出題順は原版の項目番号の昇順。シャッフルしない。
for (let i = 1; i < ItemMaster.length; i += 1) {
  if (ItemMaster[i].sourceItemId <= ItemMaster[i - 1].sourceItemId) {
    problems.push(`順序が項目番号の昇順でない: ${ItemMaster[i - 1].id} → ${ItemMaster[i].id}`);
  }
  if (ItemMaster[i].order !== i + 1) problems.push(`${ItemMaster[i].id}: order が連番でない`);
}
// 原版が8尺度のラウンドロビンであるため、隣接する2問が同じ尺度になる箇所はゼロのはず。
const adjacent = ItemMaster.filter((item, i) => i > 0 && ItemMaster[i - 1].scaleId === item.scaleId);
if (adjacent.length > 0) {
  problems.push(`隣接する2問が同じ尺度: ${adjacent.map((i) => i.id).join(", ")}`);
}

if (problems.length > 0) {
  console.error("項目マスタの検証に失敗しました:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`項目マスタ OK: ${ItemMaster.length}問 / 隣接同一尺度 0 / 順序は項目番号昇順`);
