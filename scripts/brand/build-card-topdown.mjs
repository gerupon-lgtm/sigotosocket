// ②レイアウトを上から確定させる。確定済みの帯は描き、未確定の領域は高さつきの空き枠で示す。
import sharp from "sharp";
import { MARK, holeCenter } from "../../app/js/presentation/mark.js";
import { TypeDefinitions } from "../../app/js/data/type-definitions.js";

const W = 1080, H = 1350, CX = W / 2;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Noto Serif CJK JP", "Hiragino Mincho ProN", "Yu Mincho", serif';

// ココロパレアの実装から借りた数値
const HEAD = { icon: 94, iconY: 50, gap: 22, nameSize: 48, nameBase: 100, subSize: 23, subBase: 137, decoY: 154 };
const PILL = { x: 368, y: 178, w: 344, h: 52, textSize: 27, textBase: 214 };
const TITLE = { base: 292, max: 890, size: 52, min: 38 };
// 中立副題（パレアには無い要素）
const NEUTRAL = { base: 336, size: 26 };
// 下部（パレアの下端からの距離を写した）
const FOOT = { note1: 1196, note2: 1222, noteSize: 20, pillCy: 1268, pillW: 300, pillH: 44, pillSize: 25, verBase: 1310, verSize: 15 };

const longest = [...TypeDefinitions].sort((a, b) => b.name.length - a.name.length)[0];
const longestSub = [...TypeDefinitions].sort((a, b) => b.subtitle.length - a.subtitle.length)[0];

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

// 和文は全角として幅を見積もる（安全側）
const wide = (s) => [...s].reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0);
const fitSize = (s, max, initial, min) => {
  let size = initial;
  while (size > min && wide(s) * size > max) size -= 1;
  return size;
};

const NAME = "シゴトソケット";
const SUBTITLE_TEXT = "〜ORVIS 職業興味の自己理解支援ツール〜";
// パレア同様、アプリ名を副題の幅（上限360）まで字間で伸ばす
const subW = wide(SUBTITLE_TEXT) * HEAD.subSize;
const nameNatural = wide(NAME) * HEAD.nameSize;
const nameW = Math.max(nameNatural, Math.min(360, subW));
const groupW = HEAD.icon + HEAD.gap + nameW;
const groupX = (W - groupW) / 2;
const textX = groupX + HEAD.icon + HEAD.gap;
const tracking = [...NAME].length > 1 ? (nameW - nameNatural) / ([...NAME].length - 1) : 0;

const titleSize = fitSize(longest.name, TITLE.max, TITLE.size, TITLE.min);

const body = [
  // 二重の外枠（パレア踏襲）
  `<rect x="18" y="18" width="1044" height="${H - 36}" rx="46" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>`,
  `<rect x="28" y="28" width="1024" height="${H - 56}" rx="38" fill="none" stroke="${INK}" stroke-opacity="0.12" stroke-width="2"/>`,
  // ヘッダー
  markSvg(groupX, HEAD.iconY, HEAD.icon, [7, 0]),
  t(textX, HEAD.nameBase, NAME, HEAD.nameSize, INK, { weight: "600", anchor: "start", spacing: tracking.toFixed(2) }),
  t(textX, HEAD.subBase, SUBTITLE_TEXT, HEAD.subSize, SUB, { anchor: "start" }),
  `<line x1="300" y1="${HEAD.decoY}" x2="488" y2="${HEAD.decoY}" stroke="${LINE}" stroke-width="2"/>`,
  `<line x1="592" y1="${HEAD.decoY}" x2="780" y2="${HEAD.decoY}" stroke="${LINE}" stroke-width="2"/>`,
  `<circle cx="${CX}" cy="${HEAD.decoY}" r="5" fill="#2f5486" fill-opacity="0.72"/>`,
  // 称号
  `<rect x="${PILL.x}" y="${PILL.y}" width="${PILL.w}" height="${PILL.h}" rx="26" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>`,
  t(CX, PILL.textBase, "あなたの称号", PILL.textSize, INK, { font: MINCHO }),
  t(CX, TITLE.base, longest.name, titleSize, INK, { font: MINCHO }),
  t(CX, NEUTRAL.base, longestSub.subtitle, NEUTRAL.size, SUB),
  // 空き領域
  `<rect x="60" y="360" width="960" height="${FOOT.note1 - 26 - 360}" fill="none" stroke="#8e44ad" stroke-width="2" stroke-dasharray="10 8"/>`,
  t(CX, 360 + (FOOT.note1 - 26 - 360) / 2, `未確定の領域　高さ ${FOOT.note1 - 26 - 360}px`, 30, "#8e44ad"),
  t(CX, 360 + (FOOT.note1 - 26 - 360) / 2 + 42, "キャラクター／レーダー／上位2領域／ホランド型／第2フェーズの帯100px", 24, "#8e44ad"),
  // 下部
  t(CX, FOOT.note1, "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです", FOOT.noteSize, SUB),
  t(CX, FOOT.note2, "医学的・心理学的な診断ではありません", FOOT.noteSize, SUB),
  `<rect x="${CX - FOOT.pillW / 2}" y="${FOOT.pillCy - FOOT.pillH / 2}" width="${FOOT.pillW}" height="${FOOT.pillH}" rx="22" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>`,
  t(CX, FOOT.pillCy + FOOT.pillSize * 0.36, "45問 詳細結果", FOOT.pillSize, SUB, { font: MINCHO }),
  t(CX, FOOT.verBase, "v0.1.0", FOOT.verSize, SUB),
].join("");

await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${body}</svg>`))
  .png().toFile("docs/brand/card/上から確定.png");

console.log(`称号「${longest.name}」${longest.name.length}字 → ${titleSize}px（幅 ${(wide(longest.name)*titleSize).toFixed(0)}px / 上限 ${TITLE.max}px）`);
console.log(`アプリ名の字間 ${tracking.toFixed(1)}px、塊の幅 ${groupW.toFixed(0)}px、左端 x=${groupX.toFixed(0)}`);
console.log(`未確定の領域: y=360 〜 ${FOOT.note1 - 26} / 高さ ${FOOT.note1 - 26 - 360}px`);
