// 中央にキャラクターだけを置いた全体像。実アセットで確認する。
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { MARK, holeCenter } from "../../app/js/presentation/mark.js";
import { TypeDefinitions } from "../../app/js/data/type-definitions.js";
import { resolveVisibilityAid, contrastRatio } from "../../app/js/domain/visibility-aid.js";
import { ScaleById } from "../../app/js/data/scale-definitions.js";
import { SCALE_ORDER } from "../../app/js/data/scale-order.js";

const W = 1080, H = Number(process.env.CARD_H ?? 1800), CX = W / 2;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Noto Serif CJK JP", "Hiragino Mincho ProN", serif';
const POSE = "../image/hedgehog_current_10/character-pose-analysis.png";
const PROP = "../image/hedgehog_props8_final/prop-production.png";

// 確定済みの縦位置
const Y = { icon: 61.9, name: 111.9, sub: 148.4, deco: 167.9, pillTop: 192.2, pillText: 227.3, title: 305.6, neutral: 350.1 };
// 下部は下端からの距離で決める（高さが変わっても動かない）
const FB = { note1: 130, note2: 110, pillTop2: 97, pillText2: 72, version: 44 };
for (const [k, v] of Object.entries(FB)) Y[k] = H - v;
Y.band = Y.note1 - 15 - 16 - 100;          // 帯の上端
Y.holland = Y.band - 22;
Y.top2 = Y.holland - 42;
const MID = { top: 360, bottom: Y.top2 - 30 - 60 };

const t = (x, y, s, size, fill, o = {}) => {
  const { font = SANS, weight = "normal", anchor = "middle", opacity = 1, spacing = 0 } = o;
  return `<text x="${x}" y="${y}" font-family='${font}' font-size="${size}" fill="${fill}" fill-opacity="${opacity}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${s}</text>`;
};
function markSvg(x, y, size, lit) {
  const k = size / MARK.viewBox;
  const g = [`<rect x="${2*k}" y="${2*k}" width="${116*k}" height="${116*k}" rx="${MARK.corner*k}" fill="${MARK.tile}"/>`];
  for (let i = 0; i < 8; i += 1) {
    const c = holeCenter(i), r = lit.indexOf(i);
    g.push(`<circle cx="${(c.x*k).toFixed(1)}" cy="${(c.y*k).toFixed(1)}" r="${(MARK.holeRadius*k).toFixed(1)}" fill="${r>=0?MARK.lit[r]:MARK.unlit}"/>`);
  }
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${g.join("")}</g>`;
}
const wide = (s) => [...s].reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0);

// アセットの明暗トーンを実測する
async function tones(path) {
  const { data, info } = await sharp(path).resize(160, 160, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = [];
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue;
    lum.push({ l: 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2], hex: `#${[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("")}` });
  }
  lum.sort((a, b) => a.l - b.l);
  return { dark: lum[Math.floor(lum.length * 0.1)].hex, light: lum[Math.floor(lum.length * 0.9)].hex, n: lum.length };
}

const NAME = "シゴトソケット", SUBTITLE = "〜ORVIS 自己理解支援ツール〜";
const type = TypeDefinitions.find((x) => x.typeId.includes("analysis") && x.typeId.includes("production"));
const CHAR_SIZE = Number(process.env.CHAR ?? 500);
const TITLE_SCALE = Number(process.env.TITLE_SCALE ?? 0.9);

const subW = wide(SUBTITLE) * 23, nameNat = wide(NAME) * 48;
const nameW = Math.max(nameNat, Math.min(360, subW));
const groupX = (W - (94 + 22 + nameW)) / 2, textX = groupX + 94 + 22;
let ts = 52 * TITLE_SCALE;
while (ts > 38 * TITLE_SCALE && wide(type.name) * ts > 890) ts -= 0.5;

const TOP_RATIO = Number(process.env.TOP_RATIO ?? 0.5);
const FRAME = process.env.FRAME ?? "none";
const CHART = process.env.CHART ?? "radar";   // radar | bars
const BAR_PITCH = Number(process.env.BAR_PITCH ?? 50);
const LIT_IDS = ["analysis", "production"];
function barsSvg(top) {
  const g = [];
  const labelW = 80, labelGap = 30, trackW = 560, barH = 14;
  const blockX = (W - (labelW + labelGap + trackW)) / 2;
  const labelRight = blockX + labelW, trackX = blockX + labelW + labelGap;
  SCALE_ORDER.forEach((id, i) => {
    const cy = top + i * BAR_PITCH + BAR_PITCH / 2;
    const lit = LIT_IDS.includes(id);
    const v = Math.min(1, Math.max(0.06, 0.5 + SCORES[id] / 4));
    g.push(t(labelRight, cy + 9, ScaleById[id].labelJa, 26, lit ? INK : SUB, { anchor: "end", weight: lit ? "bold" : "normal" }));
    g.push(`<rect x="${trackX}" y="${(cy - barH / 2).toFixed(1)}" width="${trackW}" height="${barH}" rx="${barH / 2}" fill="${LINE}"/>`);
    g.push(`<rect x="${trackX}" y="${(cy - barH / 2).toFixed(1)}" width="${(trackW * v).toFixed(1)}" height="${barH}" rx="${barH / 2}" fill="${lit ? "#2f5486" : "#93a8c6"}"/>`);
  });
  return g.join("");
}

const RADAR_R = Number(process.env.RADAR ?? 140);
const SCORES = { leadership:-0.4, organization:0.1, altruism:-0.9, creativity:0.3, analysis:1.3, production:1.1, adventure:-0.7, erudition:-0.8 };
function radarSvg(cy, R) {
  const ang = (i) => (-Math.PI / 2) + (Math.PI * 2 * i) / 8;
  const g = [];
  for (let ring = 1; ring <= 4; ring += 1) {
    const rr = (R * ring) / 4;
    g.push(`<polygon points="${[...Array(8)].map((_, i) => `${(CX + Math.cos(ang(i)) * rr).toFixed(1)},${(cy + Math.sin(ang(i)) * rr).toFixed(1)}`).join(" ")}" fill="none" stroke="${LINE}"/>`);
  }
  for (let i = 0; i < 8; i += 1) g.push(`<line x1="${CX}" y1="${cy}" x2="${(CX + Math.cos(ang(i)) * R).toFixed(1)}" y2="${(cy + Math.sin(ang(i)) * R).toFixed(1)}" stroke="${LINE}"/>`);
  const pts = SCALE_ORDER.map((id, i) => { const rr = R * (0.5 + SCORES[id] / 4); return `${(CX + Math.cos(ang(i)) * rr).toFixed(1)},${(cy + Math.sin(ang(i)) * rr).toFixed(1)}`; });
  g.push(`<polygon points="${pts.join(" ")}" fill="rgba(47,84,134,0.24)" stroke="#2f5486" stroke-width="3"/>`);
  SCALE_ORDER.forEach((id, i) => {
    const rr = R + 34, lit = ["analysis", "production"].includes(id);
    g.push(t((CX + Math.cos(ang(i)) * rr).toFixed(1), (cy + Math.sin(ang(i)) * rr + 9).toFixed(1), ScaleById[id].labelJa, 26, lit ? INK : SUB, { weight: lit ? "bold" : "normal" }));
  });
  return g.join("");
}

const midH = MID.bottom - MID.top;
const chartH = CHART === "bars" ? BAR_PITCH * 8 : (RADAR_R > 0 ? RADAR_R * 2 + 68 : 0);
const radarH = chartH;
const stack = CHAR_SIZE + (radarH ? 40 + radarH : 0);
const charTop = Math.round(MID.top + Number(process.env.TOP_GAP ?? 55));
const RADAR_DOWN = Number(process.env.RADAR_DOWN ?? 0);
const chartTop = MID.bottom + RADAR_DOWN - chartH;
const radarCy = chartTop + radarH / 2;
const charGap = chartTop - (charTop + CHAR_SIZE);

function frameSvg() {
  const cy = charTop + CHAR_SIZE / 2;
  if (FRAME === "circle") {
    const r = CHAR_SIZE * 0.62;
    return `<circle cx="${CX}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#2f5486" stroke-opacity="0.16" stroke-width="4"/>`;
  }
  if (FRAME === "plate") {
    const w = CHAR_SIZE * 1.35, h = CHAR_SIZE * 1.12;
    return `<rect x="${(CX - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="40" fill="#ffffff" fill-opacity="0.55" stroke="#ccd6e4" stroke-width="2"/>`;
  }
  return "";
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="18" y="18" width="1044" height="${H-36}" rx="46" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>
  <rect x="28" y="28" width="1024" height="${H-56}" rx="38" fill="none" stroke="${INK}" stroke-opacity="0.12" stroke-width="2"/>
  ${markSvg(groupX, Y.icon, 94, [7,0])}
  ${t(textX, Y.name, NAME, 48, INK, { weight:"600", anchor:"start" })}
  ${t(textX, Y.sub, SUBTITLE, 23, SUB, { anchor:"start" })}
  <line x1="300" y1="${Y.deco}" x2="488" y2="${Y.deco}" stroke="${LINE}" stroke-width="2"/>
  <line x1="592" y1="${Y.deco}" x2="780" y2="${Y.deco}" stroke="${LINE}" stroke-width="2"/>
  <circle cx="${CX}" cy="${Y.deco}" r="5" fill="#2f5486" fill-opacity="0.72"/>
  <rect x="${(W-344)/2}" y="${Y.pillTop}" width="344" height="52" rx="26" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>
  ${t(CX, Y.pillText, "あなたの称号", 27, INK, { font: MINCHO })}
  ${t(CX, Y.title, type.name, ts, INK, { font: MINCHO })}
  ${t(CX, Y.neutral, type.subtitle, 26, SUB)}
  ${frameSvg()}
  ${CHART === "bars" ? barsSvg(chartTop) : (RADAR_R > 0 ? radarSvg(radarCy, RADAR_R) : "")}
  ${t(CX, Y.top2, "探究　/　手仕事", 30, INK)}
  ${t(CX, Y.holland, "ホランド型：研究的（Investigative）", 26, SUB)}
  ${t(CX, Y.note1, "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです", 15, SUB)}
  ${t(CX, Y.note2, "医学的・心理学的な診断ではありません", 15, SUB)}
  <rect x="382" y="${Y.pillTop2}" width="316" height="34" rx="17" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>
  ${t(CX, Y.pillText2, "45問 詳細結果", 24, INK, { font: MINCHO })}
  ${t(CX, Y.version, "v0.1.0", 13, SUB, { opacity: 0.72 })}
</svg>`;

const pose = await sharp(POSE).trim({ threshold: 1 }).resize(CHAR_SIZE, CHAR_SIZE, { fit: "inside" }).png().toBuffer();
const propSize = Math.round(CHAR_SIZE * Number(process.env.PROP_RATIO ?? 0.32));
const prop = await sharp(PROP).trim({ threshold: 1 }).resize(propSize, propSize, { fit: "inside" }).png().toBuffer();

const pt = await tones(POSE);
const aid = resolveVisibilityAid(BG, { light: pt.light, dark: pt.dark });
console.log(`アセットの実測トーン  明 ${pt.light} / 暗 ${pt.dark}`);
console.log(`地色 ${BG} に対して  明側 ${contrastRatio(pt.light, BG).toFixed(2)} / 暗側 ${contrastRatio(pt.dark, BG).toFixed(2)} → 補助 ${aid.level}`);
console.log(`${CHART === "bars" ? `棒グラフ ピッチ${BAR_PITCH}` : `レーダー r=${RADAR_R}`}（縦 ${chartH}px）／中央の余り ${(midH - stack).toFixed(0)}px`);
console.log(`キャラ ${CHAR_SIZE}px（中央領域 ${midH}px の ${(CHAR_SIZE/midH*100).toFixed(0)}%、カード高の ${(CHAR_SIZE/H*100).toFixed(0)}%）／小物 ${propSize}px`);

// 明暗二重の縁取りを近似する（実装は canvas の drawSilhouette。ここは近似）
async function outlined(buf, spreadDark, spreadLight, mode = "dual") {
  const m = await sharp(buf).metadata();
  const w = m.width, h = m.height, pad = spreadDark + 4;
  const alpha = await sharp(buf).extractChannel("alpha").raw().toBuffer();
  const sil = async (hex) => sharp({ create: { width: w, height: h, channels: 3, background: hex } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
  const dark = await sil("#3b4a45"), light = await sil("#ffffff");
  const pairs = mode === "white" ? [[light, spreadDark]]
    : mode === "dark" ? [[dark, spreadDark]]
    : [[dark, spreadDark], [light, spreadLight]];
  const layers = [];
  for (const [buf2, sp] of pairs) {
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
      if (dx === 0 && dy === 0) continue;
      layers.push({ input: buf2, left: pad + dx * sp, top: pad + dy * sp });
    }
  }
  layers.push({ input: buf, left: pad, top: pad });
  return { buf: await sharp({ create: { width: w + pad * 2, height: h + pad * 2, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } })
    .composite(layers).png().toBuffer(), pad };
}
const poseMeta = await sharp(pose).metadata();
console.log(`余白を切った後のキャラ ${poseMeta.width}x${poseMeta.height}px／上の空き ${(charTop - MID.top).toFixed(0)}px`);
console.log(`キャラとレーダーの間 ${charGap.toFixed(0)}px／レーダー下端 ${(chartTop + chartH).toFixed(0)}／下の文字の上端 ${(Y.top2 - 30).toFixed(0)} → 空き ${(Y.top2 - 30 - (chartTop + chartH)).toFixed(0)}px`);
await sharp(Buffer.from(svg))
  .composite(await (async () => {
    const p2 = await outlined(prop, 7, 4, process.env.OUTLINE ?? "dual");   // 小物のみ縁取り
    const pm = await sharp(pose).metadata(), qm = await sharp(prop).metadata();
    return [
      { input: pose, left: Math.round(CX - pm.width / 2), top: charTop },
      { input: p2.buf, left: Math.round(CX + pm.width / 2 - qm.width) - p2.pad, top: charTop + pm.height - qm.height - p2.pad },
    ];
  })())
  .png().toFile(process.env.OUT ?? "docs/brand/card/中央キャラのみ.png");
console.log("ok");
