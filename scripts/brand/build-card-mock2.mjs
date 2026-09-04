// ココロパレアのカード作法を踏襲した結果カードのモック。
// 実装前の見た目確認用。確定したら card-renderer.js へ移す。
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { MARK, holeCenter } from "../../app/js/presentation/mark.js";

const W = 1080, H = 1350, CX = W / 2;
const BG = process.env.CARD_BG || "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif';
const LABELS = ["統率", "段取り", "支援", "創造", "探究", "手仕事", "挑戦", "言葉"];
const SCORES = [1.35, 0.2, -0.6, 0.4, 1.05, -1.2, -0.35, -0.85];
const LIT = [0, 4]; // 1位=統率(0) 2位=探究(4)

const txt = (x, y, s, size, fill, { font = SANS, weight = "normal", anchor = "middle", spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family='${font}' font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${s}</text>`;

function markSvg(x, y, size, lit) {
  const k = size / MARK.viewBox, g = [`<rect x="${2 * k}" y="${2 * k}" width="${116 * k}" height="${116 * k}" rx="${MARK.corner * k}" fill="${MARK.tile}"/>`];
  for (let i = 0; i < 8; i += 1) {
    const c = holeCenter(i), r = lit.indexOf(i);
    g.push(`<circle cx="${(c.x * k).toFixed(1)}" cy="${(c.y * k).toFixed(1)}" r="${(MARK.holeRadius * k).toFixed(1)}" fill="${r >= 0 ? MARK.lit[r] : MARK.unlit}"/>`);
  }
  return `<g transform="translate(${x} ${y})">${g.join("")}</g>`;
}
function pill(cx, cy, w, h, label, size) {
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" stroke="${LINE}"/>`
    + txt(cx, cy + size * 0.36, label, size, SUB);
}
function radar(cx, cy, R) {
  const ang = (i) => (-Math.PI / 2) + (Math.PI * 2 * i) / 8;
  const g = [];
  for (let ring = 1; ring <= 4; ring += 1) {
    const r = (R * ring) / 4;
    g.push(`<polygon points="${[...Array(8)].map((_, i) => `${(cx + Math.cos(ang(i)) * r).toFixed(1)},${(cy + Math.sin(ang(i)) * r).toFixed(1)}`).join(" ")}" fill="none" stroke="${LINE}"/>`);
  }
  for (let i = 0; i < 8; i += 1) g.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(ang(i)) * R).toFixed(1)}" y2="${(cy + Math.sin(ang(i)) * R).toFixed(1)}" stroke="${LINE}"/>`);
  g.push(`<polygon points="${SCORES.map((s, i) => { const r = R * (0.5 + s / 4); return `${(cx + Math.cos(ang(i)) * r).toFixed(1)},${(cy + Math.sin(ang(i)) * r).toFixed(1)}`; }).join(" ")}" fill="rgba(47,84,134,0.24)" stroke="#2f5486" stroke-width="3"/>`);
  for (let i = 0; i < 8; i += 1) {
    const r = R + 34, lit = LIT.includes(i);
    g.push(txt((cx + Math.cos(ang(i)) * r).toFixed(1), (cy + Math.sin(ang(i)) * r + 9).toFixed(1), LABELS[i], 26, lit ? INK : SUB, { weight: lit ? "bold" : "normal" }));
  }
  return g.join("");
}

const TITLE = "根拠から決める舵取り役";
const SUBTITLE = "調べてから方向を示す下調べ派";

const body = [
  // 外枠
  `<rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="36" fill="none" stroke="${LINE}" stroke-width="2"/>`,
  // ヘッダーのロックアップ
  markSvg(300, 48, 92, [7, 0]),
  txt(412, 100, "シゴトソケット", 54, INK, { weight: "bold", anchor: "start", spacing: 4 }),
  txt(CX, 160, "〜 ORVIS 職業興味の自己理解ツール 〜", 26, SUB),
  `<line x1="200" y1="192" x2="480" y2="192" stroke="${LINE}"/><circle cx="540" cy="192" r="4" fill="${LINE}"/><line x1="600" y1="192" x2="880" y2="192" stroke="${LINE}"/>`,
  // 称号
  pill(CX, 238, 260, 54, "あなたの称号", 26),
  txt(CX, 336, TITLE, 64, INK, { font: MINCHO, spacing: 2 }),
  txt(CX, 384, SUBTITLE, 28, SUB),
  // キャラクター
  `<rect x="250" y="420" width="580" height="380" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="12 10"/>`,
  txt(CX, 615, "キャラクター画像は準備中です", 28, SUB),
  // レーダー
  radar(CX, 1002, 143),
  txt(CX, 1218, "8つの領域のうち、あなたの中で高かった2つが濃く出ています", 24, SUB),
  // 下部
  pill(CX, 1260, 300, 48, "45問 詳細結果", 26),
  txt(CX, 1304, "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです", 22, SUB),
  txt(CX, 1330, "医学的・心理学的な診断ではありません　v0.1.0", 22, SUB),
].join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${body}</svg>`;
writeFileSync("/tmp/card2.svg", svg);
await sharp(Buffer.from(svg)).png().toFile(process.env.CARD_OUT || "docs/brand/card/カード改案.png");
console.log("ok");
