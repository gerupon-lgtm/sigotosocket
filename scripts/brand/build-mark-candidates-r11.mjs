import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const NAVY = "#1f3a5f", CREAM = "#f4ecdd", DARK = "#132844";
const WARM = ["#F0B06C", "#DF7F68"];
const LIT = [7, 0];
const wrap = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${NAVY}"/>
${b}
</svg>
`;
function build({ R = 34, r = 12.5, sw = 6.5, litR = null, pin = false, core = false }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const t = (-90 + 45 * i) * Math.PI / 180;
    const cx = 60 + R * Math.cos(t), cy = 60 + R * Math.sin(t);
    const k = LIT.indexOf(i);
    if (k >= 0) {
      const rr = litR ?? r;
      parts.push(`  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="${WARM[k]}"/>`);
      if (pin) parts.push(`  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr * 0.32)}" fill="${NAVY}"/>`);
    } else {
      parts.push(`  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - sw / 2)}" fill="none" stroke="${CREAM}" stroke-width="${sw}"/>`);
    }
  }
  if (core) parts.push(`  <circle cx="60" cy="60" r="12" fill="none" stroke="${CREAM}" stroke-width="6.5"/>`, `  <circle cx="60" cy="60" r="4.5" fill="${CREAM}"/>`);
  return wrap(parts.join("\n"));
}
writeFileSync(`${out}/Up_太環＋中心ソケット.svg`, build({ core: true }));
writeFileSync(`${out}/Uq_太環のみ.svg`, build({}));
writeFileSync(`${out}/Ur_太環＋点灯を大きく.svg`, build({ litR: 14.5 }));
writeFileSync(`${out}/Us_太環＋差込の芯.svg`, build({ litR: 13.5, pin: true }));
writeFileSync(`${out}/Ut_太環＋芯＋中心ソケット.svg`, build({ litR: 13.5, pin: true, core: true }));
console.log("ok");
