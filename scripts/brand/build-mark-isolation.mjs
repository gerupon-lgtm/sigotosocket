import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const NAVY = "#1f3a5f", CREAM = "#f4ecdd";
const wrap = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="比較">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${NAVY}"/>
${b}
</svg>
`;
function make({ R, r, lit, litColors }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const t = (-90 + 45 * i) * Math.PI / 180;
    const k = lit.indexOf(i);
    parts.push(`  <circle cx="${f(60 + R * Math.cos(t))}" cy="${f(60 + R * Math.sin(t))}" r="${f(r)}" fill="${k >= 0 ? litColors[k % litColors.length] : CREAM}"/>`);
  }
  return wrap(parts.join("\n"));
}
const BASE = { R: 33, r: 11, lit: [0, 2], litColors: ["#f2994a"] };
const SIZE = { R: 34, r: 12 };
const NEAR = { lit: [7, 0] };
const TWO = { litColors: ["#F0B06C", "#DF7F68"] };
writeFileSync(`${out}/1_元のU.svg`, make(BASE));
writeFileSync(`${out}/2_サイズだけ変更.svg`, make({ ...BASE, ...SIZE }));
writeFileSync(`${out}/3_点灯位置だけ隣接に.svg`, make({ ...BASE, ...NEAR }));
writeFileSync(`${out}/4_点灯色だけ2色に.svg`, make({ ...BASE, ...TWO }));
writeFileSync(`${out}/5_全部変更＝Uh.svg`, make({ ...BASE, ...SIZE, ...NEAR, ...TWO }));
console.log("ok");
