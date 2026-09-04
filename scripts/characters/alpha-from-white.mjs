// 生成画像の白背景をアルファへ抜き、1024×1024のwebpとして書き出す。
// 白背景のまま使うと、カードの地色の上に白い矩形が乗ってしまう。
//
//   node scripts/characters/alpha-from-white.mjs <入力ファイルまたはフォルダ> <出力先>
//
// 判定は「純白に近く色みのない画素を透明にする」だけの単純なもの。
// むっくんは白〜クリームの顔毛を持つので、しきい値を上げすぎると顔が抜ける。
// 変換後は必ず目視と character:check で確認する。
import { readdir, mkdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const SIZE = 1024;
const NEAR_WHITE = 246;
const MAX_CHROMA = 10;

async function convert(inputPath, outDir) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (r >= NEAR_WHITE && g >= NEAR_WHITE && b >= NEAR_WHITE && chroma <= MAX_CHROMA) {
      data[i + 3] = 0;
    }
  }
  const target = join(outDir, `${basename(inputPath, extname(inputPath))}.webp`);
  await sharp(data, { raw: { width: info.width, height: info.height, channels } })
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(target);
  return target;
}

const [inputArg, outArg] = process.argv.slice(2);
if (!inputArg || !outArg) {
  console.error("usage: node scripts/characters/alpha-from-white.mjs <input file|dir> <output dir>");
  process.exit(1);
}
const input = resolve(inputArg);
const outDir = resolve(outArg);
await mkdir(outDir, { recursive: true });

let targets = [];
try {
  targets = (await readdir(input))
    .filter((n) => [".png", ".jpg", ".jpeg", ".webp"].includes(extname(n).toLowerCase()))
    .map((n) => join(input, n));
} catch {
  targets = [input];
}
if (targets.length === 0) { console.error("変換対象の画像が見つかりません"); process.exit(1); }
for (const target of targets) console.log(`透過へ変換: ${await convert(target, outDir)}`);
console.log(`${targets.length}枚を処理しました。四隅の透明は npm run character:check で確認してください。`);
