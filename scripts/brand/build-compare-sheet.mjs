// ロゴ候補の比較シートを作る。候補SVGを置いたディレクトリで実行すると 比較.png を書き出す。
// 使い方: cd docs/brand/candidates && node ../../../scripts/brand/build-compare-sheet.mjs
import sharp from "sharp";
import { readdirSync } from "node:fs";

const dir = process.cwd();
const files = readdirSync(dir).filter((f) => f.endsWith(".svg")).sort();
const sizes = [16, 32, 64, 128];
const rowH = 168, labelW = 210, gap = 26;
const xs = [];
let x = labelW;
for (const s of sizes) { xs.push(x); x += s + gap; }
const darkX = x + 20;
const W = darkX + 128 + 30, H = 44 + rowH * files.length;

const overlays = [];
const texts = [];
for (const [i, f] of files.entries()) {
  const y0 = 44 + rowH * i;
  const cy = y0 + rowH / 2;
  texts.push(`<text x="16" y="${cy + 5}" font-family="DejaVu Sans, sans-serif" font-size="17" fill="#19332f">${f.replace(".svg", "")}</text>`);
  for (const [j, s] of sizes.entries()) {
    overlays.push({ input: await sharp(f).resize(s, s).png().toBuffer(), left: xs[j], top: Math.round(cy - s / 2) });
  }
  overlays.push({ input: await sharp(f).resize(128, 128).png().toBuffer(), left: darkX, top: Math.round(cy - 64) });
}
for (const [j, s] of sizes.entries()) texts.push(`<text x="${xs[j]}" y="30" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#496b62">${s}px</text>`);
texts.push(`<text x="${darkX}" y="30" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#496b62">dark bg</text>`);

const base = await sharp({ create: { width: W, height: H, channels: 4, background: "#f3f7f4" } })
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}"><rect x="${darkX - 16}" y="0" width="${128 + 32}" height="${H}" fill="#16241f"/>${texts.join("")}</svg>`), top: 0, left: 0 }])
  .png().toBuffer();
await sharp(base).composite(overlays).png().toFile("比較.png");
console.log("done", W, H, files.join(" / "));
