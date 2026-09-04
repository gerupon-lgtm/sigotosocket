// ②レイアウト検討用のモック。最長の文字列で組み、注釈つきの版も出す。
// 座標はここに集約する。確定したら card-layout.js として app 側へ移す。
import sharp from "sharp";
import { MARK, holeCenter } from "../../app/js/presentation/mark.js";

const W = 1080, H = 1350, CX = W / 2, INSET = 16;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif';

// 最長ケース（テスト対象の上限）
const TITLE = "知識を手仕事に落としこむ作り手";           // 15字
const SUBTITLE = "外へ出ることと書き留めることが両立する見聞派"; // 22字
const HOLLAND = "ホランドの職業興味理論では 研究的（Investigative）";
const TOP2 = "探究　/　手仕事";
const LABELS = ["統率", "段取り", "支援", "創造", "探究", "手仕事", "挑戦", "言葉"];
const SCORES = [-0.4, 0.1, -0.9, 0.3, 1.3, 1.1, -0.7, -0.8];
const LIT = [4, 5];

// ===== レイアウト定義（1箇所に集約）=====
const L = {
  frame:      { x: INSET, y: INSET, w: W - INSET * 2, h: H - INSET * 2, r: 36 },
  mark:       { x: 300, y: 40, size: 92 },
  appName:    { x: 412, baseline: 92, size: 54 },
  appSub:     { cy: 150, size: 26 },
  divider:    { y: 180 },
  titlePill:  { cy: 222, w: 260, h: 52, size: 26 },
  title:      { baseline: 308, size: 64 },
  subtitle:   { baseline: 354, size: 28 },
  character:  { x: 250, y: 384, w: 580, h: 320 },
  radar:      { cy: 878, r: 125, labelGap: 34, labelSize: 26 },
  top2:       { baseline: 1082, size: 30 },
  holland:    { baseline: 1124, size: 26 },
  band:       { x: 140, y: 1144, w: 800, h: 100 },   // 第2フェーズ用。MVPは空き
  bottomPill: { cy: 1270, w: 300, h: 48, size: 26 },
  note1:      { baseline: 1306, size: 20 },
  note2:      { baseline: 1328, size: 20 },
};

const t = (x, y, s, size, fill, { font = SANS, weight = "normal", anchor = "middle", spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family='${font}' font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${s}</text>`;

function markSvg(x, y, size, lit) {
  const k = size / MARK.viewBox;
  const g = [`<rect x="${2 * k}" y="${2 * k}" width="${116 * k}" height="${116 * k}" rx="${MARK.corner * k}" fill="${MARK.tile}"/>`];
  for (let i = 0; i < 8; i += 1) {
    const c = holeCenter(i), r = lit.indexOf(i);
    g.push(`<circle cx="${(c.x * k).toFixed(1)}" cy="${(c.y * k).toFixed(1)}" r="${(MARK.holeRadius * k).toFixed(1)}" fill="${r >= 0 ? MARK.lit[r] : MARK.unlit}"/>`);
  }
  return `<g transform="translate(${x} ${y})">${g.join("")}</g>`;
}
const pill = (cx, cy, w, h, label, size) =>
  `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" stroke="${LINE}"/>`
  + t(cx, cy + size * 0.36, label, size, SUB);

function radar({ cy, r: R, labelGap, labelSize }) {
  const ang = (i) => (-Math.PI / 2) + (Math.PI * 2 * i) / 8;
  const g = [];
  for (let ring = 1; ring <= 4; ring += 1) {
    const rr = (R * ring) / 4;
    g.push(`<polygon points="${[...Array(8)].map((_, i) => `${(CX + Math.cos(ang(i)) * rr).toFixed(1)},${(cy + Math.sin(ang(i)) * rr).toFixed(1)}`).join(" ")}" fill="none" stroke="${LINE}"/>`);
  }
  for (let i = 0; i < 8; i += 1) g.push(`<line x1="${CX}" y1="${cy}" x2="${(CX + Math.cos(ang(i)) * R).toFixed(1)}" y2="${(cy + Math.sin(ang(i)) * R).toFixed(1)}" stroke="${LINE}"/>`);
  g.push(`<polygon points="${SCORES.map((s, i) => { const rr = R * (0.5 + s / 4); return `${(CX + Math.cos(ang(i)) * rr).toFixed(1)},${(cy + Math.sin(ang(i)) * rr).toFixed(1)}`; }).join(" ")}" fill="rgba(47,84,134,0.24)" stroke="#2f5486" stroke-width="3"/>`);
  for (let i = 0; i < 8; i += 1) {
    const rr = R + labelGap, lit = LIT.includes(i);
    g.push(t((CX + Math.cos(ang(i)) * rr).toFixed(1), (cy + Math.sin(ang(i)) * rr + labelSize * 0.35).toFixed(1), LABELS[i], labelSize, lit ? INK : SUB, { weight: lit ? "bold" : "normal" }));
  }
  return g.join("");
}

const card = [
  `<rect x="${L.frame.x}" y="${L.frame.y}" width="${L.frame.w}" height="${L.frame.h}" rx="${L.frame.r}" fill="none" stroke="${LINE}" stroke-width="2"/>`,
  markSvg(L.mark.x, L.mark.y, L.mark.size, [7, 0]),
  t(L.appName.x, L.appName.baseline, "シゴトソケット", L.appName.size, INK, { weight: "bold", anchor: "start", spacing: 4 }),
  t(CX, L.appSub.cy, "〜ORVIS 職業興味の自己理解支援ツール〜", L.appSub.size, SUB),
  `<line x1="200" y1="${L.divider.y}" x2="480" y2="${L.divider.y}" stroke="${LINE}"/><circle cx="${CX}" cy="${L.divider.y}" r="4" fill="${LINE}"/><line x1="600" y1="${L.divider.y}" x2="880" y2="${L.divider.y}" stroke="${LINE}"/>`,
  pill(CX, L.titlePill.cy, L.titlePill.w, L.titlePill.h, "あなたの称号", L.titlePill.size),
  t(CX, L.title.baseline, TITLE, L.title.size, INK, { font: MINCHO, spacing: 2 }),
  t(CX, L.subtitle.baseline, SUBTITLE, L.subtitle.size, SUB),
  `<rect x="${L.character.x}" y="${L.character.y}" width="${L.character.w}" height="${L.character.h}" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="12 10"/>`,
  t(CX, L.character.y + L.character.h / 2 + 10, "キャラクター（実アセット未組込）", 28, SUB),
  radar(L.radar),
  t(CX, L.top2.baseline, TOP2, L.top2.size, INK),
  t(CX, L.holland.baseline, HOLLAND, L.holland.size, SUB),
  pill(CX, L.bottomPill.cy, L.bottomPill.w, L.bottomPill.h, "45問 詳細結果", L.bottomPill.size),
  t(CX, L.note1.baseline, "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです", L.note1.size, SUB),
  t(CX, L.note2.baseline, "医学的・心理学的な診断ではありません　v0.1.0", L.note2.size, SUB),
].join("");

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${body}</svg>`;
await sharp(Buffer.from(svg(card))).png().toFile("docs/brand/card/レイアウト案.png");

// ===== 注釈つき =====
const A = "#c0392b", G = "#1f8a4c";
const ann = (x, y, s, size = 18, fill = A, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family='Noto Sans CJK JP' font-size="${size}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
const box = (x, y, w, h, c = A) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
const overlay = [
  box(L.mark.x, L.mark.y, L.mark.size, L.mark.size),
  ann(L.mark.x - 8, L.mark.y - 8, `マーク ${L.mark.size}px`, 18, A, "end"),
  ann(700, L.appName.baseline, `アプリ名 ${L.appName.size}px bold`),
  ann(700, L.appSub.cy, `サブタイトル ${L.appSub.size}px`),
  ann(700, L.titlePill.cy + 6, `ピル h${L.titlePill.h} / 字 ${L.titlePill.size}px`),
  ann(700, L.title.baseline, `称号 ${L.title.size}px 明朝（15字）`),
  ann(700, L.subtitle.baseline, `中立副題 ${L.subtitle.size}px（22字）`),
  box(L.character.x, L.character.y, L.character.w, L.character.h, G),
  ann(L.character.x + L.character.w + 6, L.character.y + 20, `キャラ枠 ${L.character.w}×${L.character.h}`, 18, G),
  ann(870, L.radar.cy, `レーダー r=${L.radar.r}`, 18, G),
  ann(870, L.radar.cy + 24, `ラベル ${L.radar.labelSize}px`, 18, G),
  ann(700, L.top2.baseline, `上位2領域 ${L.top2.size}px`),
  ann(700, L.holland.baseline, `ホランド型 ${L.holland.size}px`),
  box(L.band.x, L.band.y, L.band.w, L.band.h, "#8e44ad"),
  ann(L.band.x + L.band.w / 2, L.band.y + L.band.h / 2 + 6, `第2フェーズ用に確保 ${L.band.w}×${L.band.h}（MVPは空き）`, 20, "#8e44ad", "middle"),
  ann(700, L.bottomPill.cy + 6, `ピル h${L.bottomPill.h} / 字 ${L.bottomPill.size}px`),
  ann(700, L.note1.baseline, `注記 ${L.note1.size}px`),
  // 余白の実測
  ann(30, L.character.y - 8, `↕ ${L.character.y - L.subtitle.baseline}px`, 17, A),
  ann(30, L.radar.cy - L.radar.r - L.radar.labelGap - 8, `↕ ${(L.radar.cy - L.radar.r - L.radar.labelGap) - (L.character.y + L.character.h)}px`, 17, A),
  ann(30, L.top2.baseline - 8, `↕ ${L.top2.baseline - (L.radar.cy + L.radar.r + L.radar.labelGap)}px`, 17, A),
].join("");
await sharp(Buffer.from(svg(card + overlay))).png().toFile("docs/brand/card/レイアウト案_注釈.png");
console.log("ok");
