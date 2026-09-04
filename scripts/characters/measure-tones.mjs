// アセットの実画像から、むっくんの代表トーン（明側・暗側）を測る。
// domain/visibility-aid.js の DEFAULT_SUBJECT_TONES はアセット制作前の【想定】値なので、
// 画像ができたらこのスクリプトの出力へ置き換える。
//
//   npm run character:tones
//
// 不透明な画素だけを対象に輝度で並べ、上位・下位の代表色を返す。
// 外れ値（縁のアンチエイリアス、ハイライト、瞳）を避けるため、
// 上下端は捨てて 5〜20% の位置を代表とする。
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(ROOT, "app/assets/characters");
const ALPHA_MIN = 200;
const LOW = 0.05;
const HIGH = 0.20;

function channelLuminance(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const luminance = ([r, g, b]) =>
  (0.2126 * channelLuminance(r)) + (0.7152 * channelLuminance(g)) + (0.0722 * channelLuminance(b));
const hex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

async function pixelsOf(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] >= ALPHA_MIN) out.push([data[i], data[i + 1], data[i + 2]]);
  }
  return out;
}

let files = [];
try { files = (await readdir(DIR)).filter((n) => n.endsWith(".webp")); } catch { /* ignore */ }
if (files.length === 0) {
  console.log("キャラクターのアセットがまだありません（app/assets/characters）");
  console.log("制作前は domain/visibility-aid.js の DEFAULT_SUBJECT_TONES（【想定】値）を使います。");
  process.exit(0);
}

const all = [];
for (const name of files) {
  const pixels = await pixelsOf(join(DIR, name));
  for (const pixel of pixels) all.push(pixel); // 100万画素をスプレッドで渡すとスタックが溢れる
  const sorted = pixels.map((p) => [p, luminance(p)]).sort((a, b) => a[1] - b[1]);
  const dark = sorted[Math.floor(sorted.length * LOW)][0];
  const light = sorted[Math.floor(sorted.length * (1 - HIGH))][0];
  console.log(`  ${basename(name).padEnd(38)} 明 ${hex(light)} / 暗 ${hex(dark)}`);
}

const sorted = all.map((p) => [p, luminance(p)]).sort((a, b) => a[1] - b[1]);
const dark = sorted[Math.floor(sorted.length * LOW)][0];
const light = sorted[Math.floor(sorted.length * (1 - HIGH))][0];
console.log(`\n全${files.length}枚をまとめた代表トーン:`);
console.log(`  light: "${hex(light)}"`);
console.log(`  dark:  "${hex(dark)}"`);
console.log("\napp/js/domain/visibility-aid.js の DEFAULT_SUBJECT_TONES をこの値へ置き換えてください。");
