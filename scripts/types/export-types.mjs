// 称号28件の一覧をCSVで書き出す。検討用の一覧表を type-definitions.js と同期させるためのもの。
// 出力は標準出力。ファイル化する場合は npm run types:export > 出力先.csv
import { TypeDefinitions } from "../../app/js/data/type-definitions.js";
import { ScaleById } from "../../app/js/data/scale-definitions.js";

function cell(value) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const lines = ["領域の組み合わせ,称号,中立副題,称号理由の中核"];
for (const type of TypeDefinitions) {
  const combo = type.scaleIds.map((id) => ScaleById[id].labelJa).join("×");
  lines.push([combo, type.name, type.subtitle, type.reason].map(cell).join(","));
}
process.stdout.write(`﻿${lines.join("\r\n")}\r\n`);
