import { writeFileSync } from "node:fs";
const out = process.argv[2];
// ココロパレアの5色を、色相の並びを保ったまま8色へ拡張したもの
const HUES = ["#F0B06C","#E5945F","#DF7F68","#C57F8E","#A98DB5","#8B93B8","#6B98AB","#82AD90"];
const wrap = (tile, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${tile}"/>
${b}
</svg>
`;
const rot = (i, d) => `  <g transform="rotate(${i * 45} 60 60)">${d}</g>`;

// Y: 8枚の羽根。パレアの花びらを8枚ぶんに絞ったもの
const petal = `<path d="M60 16 C50 16 46 29 49.5 39 C52 47 60 55 60 55 C60 55 68 47 70.5 39 C74 29 70 16 60 16Z" fill="%C"/>`;
const Y = HUES.map((c, i) => rot(i, petal.replace("%C", c))).join("\n") + `\n  <circle cx="60" cy="60" r="11" fill="#FFF9ED"/>`;

// Z: 8本の帯が中心のソケットへ差し込まれる
const bar = `<path d="M53.5 47 L52 27 A 8 8 0 0 1 68 27 L 66.5 47 Z" fill="%C"/>`;
const Z = HUES.map((c, i) => rot(i, bar.replace("%C", c))).join("\n")
  + `\n  <circle cx="60" cy="60" r="17" fill="#FFF9ED"/>\n  <circle cx="60" cy="60" r="7.5" fill="#2f6f5c"/>`;

// Y2: 羽根をひねって回転感を出す
const Y2 = HUES.map((c, i) => `  <g transform="rotate(${i * 45} 60 60)"><g transform="rotate(14 60 55)">${petal.replace("%C", c)}</g></g>`).join("\n")
  + `\n  <circle cx="60" cy="60" r="11" fill="#FFF9ED"/>`;

writeFileSync(`${out}/Y_羽根8枚.svg`, wrap("#2f6f5c", Y));
writeFileSync(`${out}/Y2_羽根8枚ひねり.svg`, wrap("#2f6f5c", Y2));
writeFileSync(`${out}/Z_8本を差し込む.svg`, wrap("#2f6f5c", Z));
writeFileSync(`${out}/Z2_8本を差し込む_紺.svg`, wrap("#1f3a5f", Z.replace('fill="#2f6f5c"', 'fill="#1f3a5f"')));
console.log("ok");
