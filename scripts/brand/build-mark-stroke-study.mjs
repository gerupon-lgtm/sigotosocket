import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const NAVY = "#1f3a5f", CREAM = "#f4ecdd";
const WARM = ["#F0B06C", "#DF7F68"];
const wrap = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${NAVY}"/>
${b}
</svg>
`;
// 元のUの寸法（環33・丸11）を保ったまま、中空の線の太さだけを振る
function make({ sw, lit = [7, 0], litR = 11, R = 33, r = 11 }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const t = (-90 + 45 * i) * Math.PI / 180;
    const cx = 60 + R * Math.cos(t), cy = 60 + R * Math.sin(t);
    const k = lit.indexOf(i);
    parts.push(k >= 0
      ? `  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(litR)}" fill="${WARM[k]}"/>`
      : `  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - sw / 2)}" fill="none" stroke="${CREAM}" stroke-width="${sw}"/>`);
  }
  return wrap(parts.join("\n"));
}
writeFileSync(`${out}/W1_線3.5.svg`, make({ sw: 3.5 }));
writeFileSync(`${out}/W2_線4.5.svg`, make({ sw: 4.5 }));
writeFileSync(`${out}/W3_線5.5.svg`, make({ sw: 5.5 }));
writeFileSync(`${out}/W4_線4.5_対向の組.svg`, make({ sw: 4.5, lit: [0, 4] }));
writeFileSync(`${out}/W5_線4.5_対向＋点灯大.svg`, make({ sw: 4.5, lit: [0, 4], litR: 13 }));
writeFileSync(`${out}/W6_塗りのまま元のU寸法.svg`, make({ sw: 0.001, lit: [7, 0] }).replace(/fill="none" stroke="#f4ecdd" stroke-width="0.001"/g, 'fill="#f4ecdd"'));
console.log("ok");
