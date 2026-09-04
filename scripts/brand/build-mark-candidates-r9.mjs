import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const NAVY = "#1f3a5f", CREAM = "#f4ecdd", DARK = "#132844";
const WARM = ["#F0B06C", "#DF7F68"];
const RAMP = ["#F0B06C","#E5945F","#DF7F68","#C57F8E","#A98DB5","#8B93B8","#6B98AB","#82AD90"];
const wrap = (tile, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${tile}"/>
${b}
</svg>
`;
function ring({ tile = NAVY, colorAt, rAt, R = 33, slot = false, offset = 0, core = [] }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const deg = offset + 45 * i;
    const r = rAt(i);
    if (slot) {
      parts.push(`  <g transform="rotate(${deg} 60 60)"><rect x="${f(60 - r * 0.62)}" y="${f(60 - R - r)}" width="${f(r * 1.24)}" height="${f(r * 2)}" rx="${f(r * 0.62)}" fill="${colorAt(i)}"/></g>`);
    } else {
      const t = (-90 + deg) * Math.PI / 180;
      parts.push(`  <circle cx="${f(60 + R * Math.cos(t))}" cy="${f(60 + R * Math.sin(t))}" r="${f(r)}" fill="${colorAt(i)}"/>`);
    }
  }
  for (const c of core) parts.push(`  <circle cx="60" cy="60" r="${c.r}" fill="${c.fill}"/>`);
  return wrap(tile, parts.join("\n"));
}
const LIT = [7, 0];
const litColor = (i) => (LIT.indexOf(i) >= 0 ? WARM[LIT.indexOf(i)] : CREAM);

writeFileSync(`${out}/Ug_スロット_クリーム＋中心穴.svg`, ring({ colorAt: litColor, rAt: () => 11, slot: true, core: [{ r: 14, fill: CREAM }, { r: 6.5, fill: DARK }] }));
writeFileSync(`${out}/Uh_環のみ_核なし.svg`, ring({ colorAt: litColor, rAt: () => 12, R: 34 }));
writeFileSync(`${out}/Ui_環＋中心はソケット穴.svg`, ring({ colorAt: litColor, rAt: () => 11, core: [{ r: 13, fill: CREAM }, { r: 6, fill: DARK }] }));
writeFileSync(`${out}/Uj_8色＋上位2つが大きい.svg`, ring({ colorAt: (i) => RAMP[i], rAt: (i) => (LIT.indexOf(i) >= 0 ? 14 : 9), R: 33, core: [{ r: 9, fill: CREAM }] }));
writeFileSync(`${out}/Uk_スロット8色.svg`, ring({ colorAt: (i) => RAMP[i], rAt: (i) => (LIT.indexOf(i) >= 0 ? 12 : 9), slot: true, R: 32, core: [{ r: 13, fill: CREAM }, { r: 6, fill: DARK }] }));
console.log("ok");
