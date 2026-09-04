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
function make({ sw, R = 33, r = 11, lit = [7, 0], solid = false, only2 = false }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const t = (-90 + 45 * i) * Math.PI / 180;
    const cx = 60 + R * Math.cos(t), cy = 60 + R * Math.sin(t);
    const k = lit.indexOf(i);
    if (k >= 0) { parts.push(`  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${WARM[k]}"/>`); continue; }
    if (only2) continue;
    parts.push(solid
      ? `  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${CREAM}"/>`
      : `  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - sw / 2)}" fill="none" stroke="${CREAM}" stroke-width="${sw}"/>`);
  }
  return wrap(parts.join("\n"));
}
writeFileSync(`${out}/a_中空4.5.svg`, make({ sw: 4.5 }));
writeFileSync(`${out}/b_中空6.0.svg`, make({ sw: 6 }));
writeFileSync(`${out}/c_塗り.svg`, make({ solid: true }));
writeFileSync(`${out}/d_大口4つ中空.svg`, make({ sw: 6, R: 30, r: 16, lit: [0] }));
console.log("ok");
