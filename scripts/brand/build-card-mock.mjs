import sharp from "sharp";
import { writeFileSync } from "node:fs";
const W = 1080, H = 1350, CX = 540;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const NAVY = "#1f3a5f", CREAM = "#f4ecdd", WARM = ["#F0B06C", "#DF7F68"];
const LABELS = ["統率","段取り","支援","創造","探究","手仕事","挑戦","言葉"];
const SCORES = [1.35, 0.2, -0.6, 0.4, 1.05, -1.2, -0.35, -0.85]; // 1位=統率 2位=探究
const F = "Noto Sans CJK JP";
const t = (x, y, s, size, fill, weight = "normal", anchor = "middle") =>
  `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${s}</text>`;

// 8口マーク（120基準を任意サイズへ）
function mark(x, y, size, lit) {
  const k = size / 120, g = [];
  g.push(`<rect x="${2 * k}" y="${2 * k}" width="${116 * k}" height="${116 * k}" rx="${28 * k}" fill="${NAVY}"/>`);
  for (let i = 0; i < 8; i += 1) {
    const a = (-90 + 45 * i) * Math.PI / 180;
    const j = lit.indexOf(i);
    g.push(`<circle cx="${(60 + 33 * Math.cos(a)) * k}" cy="${(60 + 33 * Math.sin(a)) * k}" r="${11 * k}" fill="${j >= 0 ? WARM[j] : CREAM}"/>`);
  }
  return `<g transform="translate(${x} ${y})">${g.join("")}</g>`;
}
function radar(cx, cy, R) {
  const ang = (i) => (-Math.PI / 2) + (Math.PI * 2 * i) / 8;
  const g = [];
  for (let ring = 1; ring <= 4; ring += 1) {
    const r = (R * ring) / 4;
    const p = [...Array(8)].map((_, i) => `${(cx + Math.cos(ang(i)) * r).toFixed(1)},${(cy + Math.sin(ang(i)) * r).toFixed(1)}`);
    g.push(`<polygon points="${p.join(" ")}" fill="none" stroke="${LINE}"/>`);
  }
  for (let i = 0; i < 8; i += 1) g.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(ang(i)) * R).toFixed(1)}" y2="${(cy + Math.sin(ang(i)) * R).toFixed(1)}" stroke="${LINE}"/>`);
  const p = SCORES.map((s, i) => { const r = R * (0.5 + s / 4); return `${(cx + Math.cos(ang(i)) * r).toFixed(1)},${(cy + Math.sin(ang(i)) * r).toFixed(1)}`; });
  g.push(`<polygon points="${p.join(" ")}" fill="rgba(47,84,134,0.24)" stroke="#2f5486" stroke-width="3"/>`);
  for (let i = 0; i < 8; i += 1) {
    const r = R + 34;
    g.push(t((cx + Math.cos(ang(i)) * r).toFixed(1), (cy + Math.sin(ang(i)) * r + 9).toFixed(1), LABELS[i], 26, SUB));
  }
  return g.join("");
}
const charFrame = `<rect x="240" y="220" width="600" height="480" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="12 10"/>` + t(CX, 470, "キャラクター画像は準備中です", 28, SUB);
const footer = t(CX, 1285, "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです", 22, SUB) + t(CX, 1318, "医学的・心理学的な診断ではありません　v0.1.0", 22, SUB);
const badges = t(CX, 1230, "統率　/　探究", 30, INK);
const TITLE = "根拠から決める舵取り役";

const A = `${t(CX, 130, TITLE, 62, INK, "bold")}${t(CX, 186, "シゴトソケット", 30, SUB)}${charFrame}${radar(CX, 960, 190)}${badges}${footer}`;
const B = `${mark(70, 92, 76, [0, 4])}${t(CX, 130, TITLE, 62, INK, "bold")}${t(CX, 186, "シゴトソケット", 30, SUB)}${charFrame}${radar(CX, 960, 190)}${badges}${footer}`;
const C = `${t(CX, 130, TITLE, 62, INK, "bold")}${t(CX, 186, "シゴトソケット", 30, SUB)}${charFrame}${mark(CX - 150, 810, 300, [0, 4])}${t(CX, 1180, "8つの領域のうち、上位2つが点灯しています", 26, SUB)}${badges}${footer}`;

const svg = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${b}</svg>`;
for (const [name, body] of [["A_現状", A], ["B_ヘッダーにマーク", B], ["C_レーダーをマークに置換", C]]) {
  writeFileSync(`/tmp/${name}.svg`, svg(body));
  await sharp(Buffer.from(svg(body))).resize(432, 540).png().toFile(`/tmp/${name}.png`);
}
const gap = 24, w = 432 * 3 + gap * 4, h = 540 + 70;
const base = await sharp({ create: { width: w, height: h, channels: 4, background: "#e7ede9" } })
  .composite([{ input: Buffer.from(`<svg width="${w}" height="${h}">${["A 現状（マークなし）", "B ヘッダーにマーク", "C レーダーをマークに置換"].map((s, i) => `<text x="${gap + i * (432 + gap) + 216}" y="34" font-family="${F}" font-size="22" fill="#19332f" text-anchor="middle">${s}</text>`).join("")}</svg>`), top: 0, left: 0 }])
  .png().toBuffer();
await sharp(base).composite(["A_現状", "B_ヘッダーにマーク", "C_レーダーをマークに置換"].map((n, i) => ({ input: `/tmp/${n}.png`, left: gap + i * (432 + gap), top: 50 })))
  .png().toFile("docs/brand/card/カード案.png");
console.log("ok");
