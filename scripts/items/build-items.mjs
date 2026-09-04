// 選定リストCSV → app/js/data/item-master.js を決定的に生成する。
// 並び順は原版（ORVIS付録）の項目番号の昇順。シャッフルもシードも使わない。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SOURCE = resolve(ROOT, "docs/research/ORVIS短縮版45問_選定リスト.csv");
const OUTPUT = resolve(ROOT, "app/js/data/item-master.js");

const SCALE_ID_BY_LABEL = {
  "リーダーシップ": "leadership",
  "組織化": "organization",
  "利他性": "altruism",
  "創造性": "creativity",
  "分析": "analysis",
  "生産": "production",
  "冒険": "adventure",
  "学識": "erudition",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else { field += ch; }
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

const raw = readFileSync(SOURCE, "utf8").replace(/^﻿/, "");
const [header, ...body] = parseCsv(raw);
const index = Object.fromEntries(header.map((name, i) => [name.trim(), i]));
for (const column of ["採用", "尺度", "項目番号", "設問（日本語訳）", "負荷量(大学生)", "負荷量(地域)", "ローカライズ"]) {
  if (!(column in index)) throw new Error(`ITEM_SOURCE_COLUMN_MISSING: ${column}`);
}

const adopted = body
  .filter((cells) => cells[index["採用"]].trim() === "採用")
  .map((cells) => {
    const label = cells[index["尺度"]].trim();
    const scaleId = SCALE_ID_BY_LABEL[label];
    if (!scaleId) throw new Error(`ITEM_SOURCE_SCALE_UNKNOWN: ${label}`);
    const sourceItemId = Number.parseInt(cells[index["項目番号"]], 10);
    if (!Number.isInteger(sourceItemId)) throw new Error("ITEM_SOURCE_ID_INVALID");
    const textJa = cells[index["設問（日本語訳）"]].trim();
    if (textJa.length === 0) throw new Error(`ITEM_SOURCE_TEXT_EMPTY: ${sourceItemId}`);
    return {
      sourceItemId,
      scaleId,
      textJa,
      loadingCollege: Number.parseFloat(cells[index["負荷量(大学生)"]]),
      loadingCommunity: Number.parseFloat(cells[index["負荷量(地域)"]]),
      localized: cells[index["ローカライズ"]].trim().length > 0,
    };
  })
  .sort((a, b) => a.sourceItemId - b.sourceItemId);

const lines = adopted.map((item, i) => {
  const id = `orvis-${String(item.sourceItemId).padStart(2, "0")}`;
  return `  { id: ${JSON.stringify(id)}, order: ${i + 1}, scaleId: ${JSON.stringify(item.scaleId)}, `
    + `textJa: ${JSON.stringify(item.textJa)}, keyedDirection: "positive", `
    + `sourceItemId: ${item.sourceItemId}, loadingCollege: ${item.loadingCollege}, `
    + `loadingCommunity: ${item.loadingCommunity}, localized: ${item.localized} },`;
});

const output = `// 生成物。手で編集しない。\n`
  + `// 生成元: docs/research/ORVIS短縮版45問_選定リスト.csv\n`
  + `// 生成:   npm run items:build\n`
  + `// 並び順: 原版（ORVIS付録）の項目番号の昇順。シャッフルしない。\n`
  + `// ORVISに逆転項目は存在しないため keyedDirection は全件 "positive"。\n\n`
  + `export const ItemMaster = Object.freeze([\n${lines.join("\n")}\n].map(Object.freeze));\n`;

writeFileSync(OUTPUT, output, "utf8");
console.log(`generated ${adopted.length} items -> app/js/data/item-master.js`);
