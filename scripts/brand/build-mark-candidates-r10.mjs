import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const NAVY = "#1f3a5f", CREAM = "#f4ecdd", DARK = "#132844";
const WARM = ["#F0B06C", "#DF7F68"];
const RAMP = ["#F0B06C","#E5945F","#DF7F68","#C57F8E","#A98DB5","#8B93B8","#6B98AB","#82AD90"];
const LIT = [7, 0];
const wrap = (tile, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${tile}"/>
${b}
</svg>
`;
// 中空＝空いている差し込み口、塗り＝差さっている口
function hollowRing({ tile = NAVY, ringColor = CREAM, litColors = WARM, R = 33, r = 11, sw = 4.5, core = [], ramp = false }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const t = (-90 + 45 * i) * Math.PI / 180;
    const cx = 60 + R * Math.cos(t), cy = 60 + R * Math.sin(t);
    const k = LIT.indexOf(i);
    const col = ramp ? RAMP[i] : ringColor;
    if (k >= 0) {
      parts.push(`  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${litColors[k]}"/>`);
    } else {
      parts.push(`  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - sw / 2)}" fill="none" stroke="${col}" stroke-width="${sw}"/>`);
    }
  }
  for (const c of core) parts.push(c.stroke
    ? `  <circle cx="60" cy="60" r="${c.r}" fill="none" stroke="${c.stroke}" stroke-width="${c.sw}"/>`
    : `  <circle cx="60" cy="60" r="${c.r}" fill="${c.fill}"/>`);
  return wrap(tile, parts.join("\n"));
}
writeFileSync(`${out}/Ul_中空8口＋2口が差さる.svg`, hollowRing({}));
writeFileSync(`${out}/Um_中空8口＋中心ソケット.svg`, hollowRing({ core: [{ r: 13, fill: CREAM }, { r: 6, fill: DARK }] }));
writeFileSync(`${out}/Un_中空8色＋2口が差さる.svg`, hollowRing({ ramp: true, sw: 5 }));
writeFileSync(`${out}/Uo_中空_太環.svg`, hollowRing({ r: 12.5, sw: 6.5, R: 34 }));
console.log("ok");
