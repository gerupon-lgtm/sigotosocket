import sharp from "sharp";
import { readdirSync } from "node:fs";
const files = readdirSync(process.cwd()).filter((f) => f.endsWith(".svg")).sort();
const sizes = [16, 24, 32, 48, 64, 180];
const rowH = 210, labelW = 150, gap = 30;
const xs = []; let x = labelW;
for (const s of sizes) { xs.push(x); x += s + gap; }
const W = x + 10, H = 44 + rowH * files.length;
const overlays = [], texts = [];
for (const [i, fn] of files.entries()) {
  const cy = 44 + rowH * i + rowH / 2;
  texts.push(`<text x="14" y="${cy + 5}" font-family="DejaVu Sans, sans-serif" font-size="16" fill="#19332f">${fn.replace(".svg", "")}</text>`);
  for (const [j, s] of sizes.entries()) overlays.push({ input: await sharp(fn).resize(s, s).png().toBuffer(), left: xs[j], top: Math.round(cy - s / 2) });
}
for (const [j, s] of sizes.entries()) texts.push(`<text x="${xs[j]}" y="30" font-family="DejaVu Sans, sans-serif" font-size="14" fill="#496b62">${s}</text>`);
const base = await sharp({ create: { width: W, height: H, channels: 4, background: "#f3f7f4" } })
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${texts.join("")}</svg>`), top: 0, left: 0 }]).png().toBuffer();
await sharp(base).composite(overlays).png().toFile("実寸.png");
console.log("done");
