// 文字の大きさを段階で比較する。寸法は比率で定義し、pxを直書きしない。
import sharp from "sharp";
import { MARK, holeCenter } from "../../app/js/presentation/mark.js";
import { TypeDefinitions } from "../../app/js/data/type-definitions.js";

const W = 1080, H = 1350;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Noto Serif CJK JP", "Hiragino Mincho ProN", serif';

// 幅に対する比率（ココロパレアの実装値 ÷ 1080 を出発点にする）
const R = {
  icon:      94 / 1080,
  name:      48 / 1080,
  subtitle:  23 / 1080,
  pillText:  27 / 1080,
  title:     52 / 1080,
  titleMin:  38 / 1080,
  titleMax: 890 / 1080,
  neutral:   26 / 1080,
  gap:       22 / 1080,
  pillW:    344 / 1080,
  pillH:     52 / 1080,
};
// 縦位置は高さに対する配分
const V = { iconTop: 0.037, nameBase: 0.074, subBase: 0.101, deco: 0.114, pillTop: 0.132, pillTextBase: 0.158, titleBase: 0.216, neutralBase: 0.249 };

const wide = (s) => [...s].reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0);
const t = (x, y, s, size, fill, { font = SANS, weight = "normal", anchor = "middle", spacing = 0 } = {}) =>
  `<text x="${x}" y="${y.toFixed(1)}" font-family='${font}' font-size="${size.toFixed(1)}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${s}</text>`;
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
const SUBTITLE = process.env.SUBTITLE || "〜ORVIS 自己理解支援ツール〜";

function block(scale) {
  const S = (k) => W * R[k] * scale;
  const icon = S("icon"), gap = S("gap");
  const subW = wide(SUBTITLE) * S("subtitle");
  const nameNat = wide(NAME) * S("name");
  const nameW = Math.max(nameNat, Math.min(360 * scale, subW));
  const groupW = icon + gap + nameW;
  const groupX = (W - groupW) / 2;
  const textX = groupX + icon + gap;
  const tracking = (nameW - nameNat) / ([...NAME].length - 1);
  let ts = S("title");
  const tsMin = S("titleMin"), tsMax = W * R.titleMax;
  while (ts > tsMin && wide(longest.name) * ts > tsMax) ts -= 0.5;
  const pillW = S("pillW"), pillH = S("pillH");
  return { icon, groupX, textX, tracking, ts,
    parts: [
      `<rect x="18" y="18" width="1044" height="${H-36}" rx="46" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>`,
      `<rect x="28" y="28" width="1024" height="${H-56}" rx="38" fill="none" stroke="${INK}" stroke-opacity="0.12" stroke-width="2"/>`,
      markSvg(groupX, H*V.iconTop, icon, [7,0]),
      t(textX, H*V.nameBase, NAME, S("name"), INK, { weight:"600", anchor:"start", spacing: tracking.toFixed(2) }),
      t(textX, H*V.subBase, SUBTITLE, S("subtitle"), SUB, { anchor:"start" }),
      `<line x1="300" y1="${H*V.deco}" x2="488" y2="${H*V.deco}" stroke="${LINE}" stroke-width="2"/>`,
      `<line x1="592" y1="${H*V.deco}" x2="780" y2="${H*V.deco}" stroke="${LINE}" stroke-width="2"/>`,
      `<circle cx="${W/2}" cy="${H*V.deco}" r="5" fill="#2f5486" fill-opacity="0.72"/>`,
      `<rect x="${(W-pillW)/2}" y="${H*V.pillTop}" width="${pillW}" height="${pillH}" rx="${pillH/2}" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>`,
      t(W/2, H*V.pillTextBase, "あなたの称号", S("pillText"), INK, { font: MINCHO }),
      t(W/2, H*V.titleBase, longest.name, ts, INK, { font: MINCHO }),
      t(W/2, H*V.neutralBase, longestSub.subtitle, S("neutral"), SUB),
    ].join("") };
}

const scales = [1.0, 0.9, 0.82];
const out = [];
for (const sc of scales) {
  const b = block(sc);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${b.parts}</svg>`;
  out.push(await sharp(Buffer.from(svg)).extract({ left:0, top:0, width:W, height:400 }).resize(540).png().toBuffer());
  console.log(`比率 ${sc}: アプリ名 ${(W*R.name*sc).toFixed(1)}px / 副題 ${(W*R.subtitle*sc).toFixed(1)}px / 称号 ${b.ts.toFixed(1)}px（最長15字の幅 ${(15*b.ts).toFixed(0)}px）`);
}
const cw = 540, ch = Math.round(400 * 540 / W), gap = 24;
const SW = cw + gap * 2, SH = (ch + 46) * scales.length + gap;
const rows = scales.map((s, i) =>
  `<text x="${gap}" y="${gap + i * (ch + 46) + 26}" font-family="Noto Sans CJK JP" font-size="22" fill="#1b2a44">比率 ${Math.round(s * 100)}%　（アプリ名 ${(W * R.name * s).toFixed(0)}px ／ 称号 ${(W * R.title * s).toFixed(0)}px ／ 副題 ${(W * R.subtitle * s).toFixed(0)}px）</text>`).join("");
const base = await sharp({ create: { width: SW, height: SH, channels: 4, background: "#ffffff" } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">${rows}</svg>`), top: 0, left: 0 }]).png().toBuffer();
await sharp(base).composite(out.map((b, i) => ({ input: b, left: gap, top: gap + i * (ch + 46) + 40 }))).png().toFile("docs/brand/card/文字比率比較.png");
console.log("ok");
