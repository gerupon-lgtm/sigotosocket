// 元画像を配布用の 1024×1024 webp へ変換する。
//
//   node scripts/characters/build-character-assets.mjs <入力フォルダ> <出力フォルダ>
//
// **1枚ずつ余白を切らない。**フォルダ内の全種の実体を包む矩形を求め、同じ矩形で切る。
// 1枚ずつ切ると、立った姿勢と伏せた姿勢が同じ高さに正規化され、絵柄の意図する
// 大小の差が消える（実測でポーズの縦横比は 0.75〜1.05 とばらつく）。
// 共通の余白だけを落とせば、相対的な大小は保たれる。
import { readdir, mkdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const SIZE = 1024;
const ALPHA_THRESHOLD = 16;

async function boundingBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(((y * info.width) + x) * info.channels) + 3] > ALPHA_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`ASSET_FULLY_TRANSPARENT: ${file}`);
  return { x0, y0, x1, y1, width: info.width, height: info.height };
}

export async function buildAssets(inputDir, outputDir) {
  const files = (await readdir(inputDir)).filter((n) => /\.(png|webp)$/i.test(n)).sort();
  if (files.length === 0) throw new Error(`ASSET_INPUT_EMPTY: ${inputDir}`);

  const boxes = [];
  for (const name of files) boxes.push(await boundingBox(join(inputDir, name)));
  const union = boxes.reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
    width: a.width, height: a.height,
  }));
  const w = union.x1 - union.x0 + 1;
  const h = union.y1 - union.y0 + 1;
  // sharp は extract → resize → extend の順で適用する。
  // extend で正方形へ広げると**リサイズ後**に効いてしまうため、
  // fit:"contain" を使い「縦横比を保ったまま余白を足して正方形に収める」を1回で行う。
  const side = Math.max(w, h);

  await mkdir(outputDir, { recursive: true });
  for (const name of files) {
    const out = join(outputDir, `${basename(name, extname(name))}.webp`);
    await sharp(join(inputDir, name))
      .extract({ left: union.x0, top: union.y0, width: w, height: h })
      .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(out);
  }
  return { count: files.length, union: { x0: union.x0, y0: union.y0, w, h }, side, source: union.width };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("使い方: node scripts/characters/build-character-assets.mjs <入力フォルダ> <出力フォルダ>");
    process.exit(1);
  }
  const r = await buildAssets(resolve(input), resolve(output));
  console.log(`${r.count}点を変換: 元${r.source}px四方 → 共通矩形 ${r.union.w}x${r.union.h}（左上 ${r.union.x0},${r.union.y0}）→ 正方 ${r.side} → ${SIZE}px webp`);
}
