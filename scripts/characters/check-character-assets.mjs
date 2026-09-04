// アセットの体裁を機械的に検査する。目視の前に必ず通す。
// - 1024×1024 であること
// - アルファチャンネルを持ち、四隅が透明であること（白背景のまま書き出す事故を防ぐ）
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIRS = [join(ROOT, "app/assets/characters"), join(ROOT, "app/assets/props")];
const SIZE = 1024;
const problems = [];
let checked = 0;

async function cornerAlpha(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => data[(((y * info.width) + x) * info.channels) + 3];
  const m = 4;
  return [at(m, m), at(info.width - 1 - m, m), at(m, info.height - 1 - m),
    at(info.width - 1 - m, info.height - 1 - m)];
}

for (const dir of DIRS) {
  let files = [];
  try { files = (await readdir(dir)).filter((n) => n.endsWith(".webp")); } catch { continue; }
  for (const name of files) {
    const file = join(dir, name);
    checked += 1;
    const meta = await sharp(file).metadata();
    if (meta.width !== SIZE || meta.height !== SIZE) {
      problems.push(`${basename(file)}: ${meta.width}×${meta.height}。${SIZE}×${SIZE} でない`);
    }
    if (!meta.hasAlpha) {
      problems.push(`${basename(file)}: アルファチャンネルがない（白背景のまま書き出していないか）`);
      continue;
    }
    const corners = await cornerAlpha(file);
    if (corners.some((a) => a > 8)) {
      problems.push(`${basename(file)}: 四隅が透明でない (alpha=${corners.join(",")})`);
    }
  }
}

if (checked === 0) { console.log("アセットがまだありません（app/assets/characters, app/assets/props）"); process.exit(0); }
if (problems.length > 0) {
  console.error("アセットの検査に失敗しました:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`アセット OK: ${checked}枚（1024×1024・アルファあり・四隅が透明）`);
