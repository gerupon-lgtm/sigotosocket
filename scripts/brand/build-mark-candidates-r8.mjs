import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const wrap = (tile, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${tile}"/>
${b}
</svg>
`;

function ring({ tile, hole, lit, litIdx, R = 33, r = 11, offset = 0, core = null, slot = false }) {
  const parts = [];
  for (let i = 0; i < 8; i += 1) {
    const deg = offset + 45 * i;
    const k = litIdx.indexOf(i);
    const fill = k >= 0 ? lit[k % lit.length] : hole;
    if (slot) {
      parts.push(`  <g transform="rotate(${deg} 60 60)"><rect x="${f(60 - r * 0.62)}" y="${f(60 - R - r)}" width="${f(r * 1.24)}" height="${f(r * 2)}" rx="${f(r * 0.62)}" fill="${fill}"/></g>`);
    } else {
      const t = (-90 + deg) * Math.PI / 180;
      parts.push(`  <circle cx="${f(60 + R * Math.cos(t))}" cy="${f(60 + R * Math.sin(t))}" r="${r}" fill="${fill}"/>`);
    }
  }
  if (core) parts.push(`  <circle cx="60" cy="60" r="${core.r}" fill="${core.fill}"/>`);
  return wrap(tile, parts.join("\n"));
}

const NAVY = "#1f3a5f", DARK = "#132844", CREAM = "#f4ecdd";
const WARM = ["#F0B06C", "#DF7F68"];
const GREEN = "#2f6f5c", GDARK = "#20503f", GCREAM = "#f4f8f5", GWARM = ["#F0B06C", "#DF7F68"];

writeFileSync(`${out}/Ua_穴＋隣接2灯.svg`, ring({ tile: NAVY, hole: DARK, lit: WARM, litIdx: [7, 0] }));
writeFileSync(`${out}/Ub_穴＋対向2灯＋核.svg`, ring({ tile: NAVY, hole: DARK, lit: WARM, litIdx: [0, 4], core: { r: 9, fill: CREAM } }));
writeFileSync(`${out}/Uc_クリーム＋隣接2灯＋核.svg`, ring({ tile: NAVY, hole: CREAM, lit: WARM, litIdx: [7, 0], core: { r: 9, fill: CREAM } }));
writeFileSync(`${out}/Ud_スロット型＋隣接2灯.svg`, ring({ tile: NAVY, hole: DARK, lit: WARM, litIdx: [7, 0], slot: true, core: { r: 13, fill: CREAM } }));
writeFileSync(`${out}/Ue_大穴＋22.5度回し.svg`, ring({ tile: NAVY, hole: DARK, lit: WARM, litIdx: [0, 1], R: 34, r: 12.5, offset: 22.5 }));
writeFileSync(`${out}/Uf_緑地＋穴＋隣接2灯.svg`, ring({ tile: GREEN, hole: GDARK, lit: GWARM, litIdx: [7, 0], core: { r: 9, fill: GCREAM } }));
console.log("ok");
