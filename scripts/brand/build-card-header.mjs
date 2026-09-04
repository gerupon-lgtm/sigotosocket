// ヘッダー帯の確定用。要素ごとに比率を持ち、ヘッダー全体の下げ幅を振って比較する。
import sharp from "sharp";
import { MARK, holeCenter } from "../../app/js/presentation/mark.js";
import { TypeDefinitions } from "../../app/js/data/type-definitions.js";

const W = 1080, H = 1350, CX = W / 2;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Noto Serif CJK JP", "Hiragino Mincho ProN", serif';

// 幅1080に対する係数（ココロパレアの実装値 ÷ 1080）
const K = { icon: 94, name: 48, subtitle: 23, pillText: 27, title: 52, titleMin: 38, titleMax: 890, neutral: 26, gap: 22, pillW: 344, pillH: 52 };
// 要素ごとの比率
const SCALE = { icon: 1.0, name: 1.0, subtitle: 1.0, pillText: 1.0, title: 0.9, neutral: 1.0 };
// 縦位置（高さ1350に対する配分）
const V = { iconTop: 0.037, nameBase: 0.074, subBase: 0.101, deco: 0.114, pillTop: 0.132, pillTextBase: 0.158, titleBase: 0.216, neutralBase: 0.249 };

const px = (k, s = 1) => (W * K[k] / 1080) * (SCALE[k] ?? 1) * s;
const wide = (s) => [...s].reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0);
const t = (x, y, s, size, fill, o = {}) => {
  const { font = SANS, weight = "normal", anchor = "middle", spacing = 0 } = o;
  return `<text x="${x}" y="${y.toFixed(1)}" font-family='${font}' font-size="${size.toFixed(1)}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${s}</text>`;
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

const longest = [...TypeDefinitions].sort((a,b)=>b.name.length-a.name.length)[0];
const longestSub = [...TypeDefinitions].sort((a,b)=>b.subtitle.length-a.subtitle.length)[0];
const NAME = "シゴトソケット";
const SUBTITLE = "〜ORVIS 自己理解支援ツール〜";

function render(offset) {
  const icon = px("icon"), gap = px("gap"), nameSize = px("name"), subSize = px("subtitle");
  const subW = wide(SUBTITLE) * subSize;
  const nameNat = wide(NAME) * nameSize;
  const nameW = Math.max(nameNat, Math.min(360, subW));
  const groupX = (W - (icon + gap + nameW)) / 2;
  const textX = groupX + icon + gap;
  const tracking = (nameW - nameNat) / ([...NAME].length - 1);
  let ts = px("title");
  const tsMin = px("titleMin") * SCALE.title, tsMax = W * K.titleMax / 1080;
  while (ts > tsMin && wide(longest.name) * ts > tsMax) ts -= 0.5;
  const pillW = px("pillW"), pillH = px("pillH");
  // 区切り線から下は、さらに2px下げる（2026-09-04 本人指示）
  const BELOW = new Set(["deco", "pillTop", "pillTextBase", "titleBase", "neutralBase"]);
  const y = (k) => H * V[k] + offset + (BELOW.has(k) ? 2 : 0);
  return { ts, tracking, nameW, parts: [
    `<rect x="18" y="18" width="1044" height="${H-36}" rx="46" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>`,
    `<rect x="28" y="28" width="1024" height="${H-56}" rx="38" fill="none" stroke="${INK}" stroke-opacity="0.12" stroke-width="2"/>`,
    markSvg(groupX, y("iconTop"), icon, [7,0]),
    t(textX, y("nameBase"), NAME, nameSize, INK, { weight:"600", anchor:"start", spacing: tracking.toFixed(2) }),
    t(textX, y("subBase"), SUBTITLE, subSize, SUB, { anchor:"start" }),
    `<line x1="300" y1="${y("deco").toFixed(1)}" x2="488" y2="${y("deco").toFixed(1)}" stroke="${LINE}" stroke-width="2"/>`,
    `<line x1="592" y1="${y("deco").toFixed(1)}" x2="780" y2="${y("deco").toFixed(1)}" stroke="${LINE}" stroke-width="2"/>`,
    `<circle cx="${CX}" cy="${y("deco").toFixed(1)}" r="5" fill="#2f5486" fill-opacity="0.72"/>`,
    `<rect x="${(W-pillW)/2}" y="${y("pillTop").toFixed(1)}" width="${pillW}" height="${pillH}" rx="${pillH/2}" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>`,
    t(CX, y("pillTextBase"), "あなたの称号", px("pillText"), INK, { font: MINCHO }),
    t(CX, y("titleBase"), longest.name, ts, INK, { font: MINCHO }),
    t(CX, y("neutralBase"), longestSub.subtitle, px("neutral"), SUB),
  ].join("") };
}

const offsets = (process.env.OFFSETS ?? "0,16,28").split(",").map(Number);
const crops = [];
for (const off of offsets) {
  const r = render(off);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${r.parts}</svg>`;
  crops.push(await sharp(Buffer.from(svg)).extract({ left:0, top:0, width:W, height:Number(process.env.CROP ?? 400) }).resize(Number(process.env.PREVIEW ?? 640)).png().toBuffer());
  console.log(`下げ幅 +${off}px: 内枠(28)からアイコン上端まで ${(H*V.iconTop+off-28).toFixed(0)}px / 称号 ${r.ts.toFixed(1)}px / アプリ名の字間 ${r.tracking.toFixed(1)}px`);
}
const cw = Number(process.env.PREVIEW ?? 640), ch = Math.round(Number(process.env.CROP ?? 400) * cw / W), gap = 24;
const SW = cw + gap*2, SH = (ch + 44) * offsets.length + gap;
const labels = offsets.map((o,i)=>`<text x="${gap}" y="${gap + i*(ch+44) + 24}" font-family="Noto Sans CJK JP" font-size="21" fill="#1b2a44">ヘッダーを +${o}px 下げる（内枠からの余白 ${(H*V.iconTop+o-28).toFixed(0)}px）</text>`).join("");
const base = await sharp({create:{width:SW,height:SH,channels:4,background:"#ffffff"}})
  .composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">${labels}</svg>`),top:0,left:0}]).png().toBuffer();
await sharp(base).composite(crops.map((b,i)=>({input:b,left:gap,top:gap+i*(ch+44)+36}))).png().toFile(process.env.OUT ?? "docs/brand/card/ヘッダー下げ幅.png");
console.log("ok");
