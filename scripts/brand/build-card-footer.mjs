// 下部ブロックの確定用。下端からの距離で置き、注記のサイズを振って比較する。
import sharp from "sharp";

const W = 1080, H = 1350, CX = W / 2;
const BG = "#f4f6fa", INK = "#1b2a44", SUB = "#4a5b7a", LINE = "#ccd6e4";
const SANS = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';
const MINCHO = '"Noto Serif CJK JP", "Hiragino Mincho ProN", serif';

// ココロパレア（1800）の下端からの距離をそのまま使う
const FROM_BOTTOM = { note1: 130, note2: 110, pillTop: 97, pillBottom: 63, pillText: 72, version: 44, innerFrame: 28 };
const B = (k) => H - FROM_BOTTOM[k];

const NOTE1 = "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです";
const NOTE2 = "医学的・心理学的な診断ではありません";
const HOLLAND = "ホランド型：研究的（Investigative）";
const TOP2 = "探究　/　手仕事";

const t = (x, y, s, size, fill, o = {}) => {
  const { font = SANS, weight = "normal", anchor = "middle", opacity = 1 } = o;
  return `<text x="${x}" y="${y.toFixed(1)}" font-family='${font}' font-size="${size}" fill="${fill}" fill-opacity="${opacity}" font-weight="${weight}" text-anchor="${anchor}">${s}</text>`;
};

function footer(noteSize) {
  const bandBottom = B("note1") - noteSize - 16;
  const band = { y: bandBottom - 100, h: 100 };
  const hollandBase = band.y - 22;
  const top2Base = hollandBase - 42;
  return { top: top2Base - 30, band, parts: [
    `<rect x="18" y="18" width="1044" height="${H-36}" rx="46" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="3"/>`,
    `<rect x="28" y="28" width="1024" height="${H-56}" rx="38" fill="none" stroke="${INK}" stroke-opacity="0.12" stroke-width="2"/>`,
    t(CX, top2Base, TOP2, 30, INK),
    t(CX, hollandBase, HOLLAND, 26, SUB),
    `<rect x="140" y="${band.y}" width="800" height="${band.h}" fill="none" stroke="#8e44ad" stroke-width="2" stroke-dasharray="10 8"/>`,
    t(CX, band.y + band.h / 2 + 8, `第2フェーズの帯 800×100（MVPは空き）`, 22, "#8e44ad"),
    t(CX, B("note1"), NOTE1, noteSize, SUB),
    t(CX, B("note2"), NOTE2, noteSize, SUB),
    `<rect x="382" y="${B("pillTop")}" width="316" height="34" rx="17" fill="#ffffff" fill-opacity="0.9" stroke="${LINE}"/>`,
    t(CX, B("pillText"), "45問 詳細結果", 24, INK, { font: MINCHO }),
    t(CX, B("version"), "v0.1.0", 13, SUB, { opacity: 0.72 }),
  ].join("") };
}

const sizes = [15, 18];
const crops = [];
for (const ns of sizes) {
  const f = footer(ns);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${f.parts}</svg>`;
  const top = 960;
  crops.push(await sharp(Buffer.from(svg)).extract({ left: 0, top, width: W, height: H - top }).resize(760).png().toBuffer());
  console.log(`注記 ${ns}px: 帯 y=${f.band.y} / この帯の上端 ${f.top.toFixed(0)} → キャラ＋レーダーに使えるのは y=360〜${f.top.toFixed(0)} の ${(f.top - 360).toFixed(0)}px`);
}
const cw = 760, ch = Math.round((H - 960) * 760 / W), gap = 24;
const SW = cw + gap * 2, SH = (ch + 44) * sizes.length + gap;
const labels = sizes.map((s, i) => `<text x="${gap}" y="${gap + i*(ch+44) + 24}" font-family="Noto Sans CJK JP" font-size="21" fill="#1b2a44">注記 ${s}px${s === 15 ? "（ココロパレアと同値）" : ""}</text>`).join("");
const base = await sharp({ create: { width: SW, height: SH, channels: 4, background: "#ffffff" } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">${labels}</svg>`), top: 0, left: 0 }]).png().toBuffer();
await sharp(base).composite(crops.map((b, i) => ({ input: b, left: gap, top: gap + i*(ch+44) + 36 }))).png().toFile("docs/brand/card/下部ブロック.png");
console.log("ok");
