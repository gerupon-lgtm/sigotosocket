import { writeFileSync } from "node:fs";
const out = process.argv[2];
const f = (n) => n.toFixed(1);
const tile = `<rect x="2" y="2" width="116" height="116" rx="28" fill="__TILE__"/>`;
const wrap = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">\n  ${tile}\n${b}\n</svg>\n`;

// U: 8つの差し込み口が環になり、上位2領域の2つだけ点灯する
function ring(litA, litB) {
  const cx = 60, cy = 60, R = 33, r = 11;
  const holes = [];
  for (let i = 0; i < 8; i += 1) {
    const t = -Math.PI / 2 + (Math.PI / 4) * i;
    const lit = i === litA || i === litB;
    holes.push(`  <circle cx="${f(cx + R * Math.cos(t))}" cy="${f(cy + R * Math.sin(t))}" r="${r}" fill="${lit ? "__ACC__" : "__MARK__"}"/>`);
  }
  return holes.join("\n");
}

// X: むっくん。とげを大きな三角にして輪郭を強くする
function mukkun() {
  const cx = 64, cy = 86, rx = 42, ry = 34, n = 5, amp = 0.34;
  const pts = [];
  for (let i = 0; i <= n * 2; i += 1) {
    const t = Math.PI + (Math.PI * i) / (n * 2);
    const k = i % 2 === 0 ? 1 : 1 + amp;
    pts.push(`${f(cx + rx * k * Math.cos(t))} ${f(cy + ry * k * Math.sin(t))}`);
  }
  const spikes = `M ${f(cx - rx)} ${f(cy)} L ${pts.join(" L ")} L ${f(cx + rx)} ${f(cy)} Z`;
  return `  <path d="${spikes}" fill="__ACC__"/>
  <path d="M 22 86 C 22 86 20 74 30 68 C 40 62 54 62 62 68 C 70 74 72 86 72 86 Z" fill="__MARK__"/>
  <path d="M 22 86 L 22 86 A 42 34 0 0 0 106 86 Z" fill="__MARK__"/>
  <circle cx="41" cy="74" r="5" fill="__TILE__"/>
  <circle cx="24" cy="82" r="4.5" fill="__TILE__"/>`;
}

writeFileSync(`${out}/U_8口2点灯.svg`, wrap(ring(0, 2)));
writeFileSync(`${out}/V_8口2点灯_隣.svg`, wrap(ring(6, 7)));
writeFileSync(`${out}/W_噛み合う半円.svg`, wrap(`  <path d="M 74 22 A 38 38 0 1 0 74 98 A 24 24 0 1 1 74 22 Z" fill="__MARK__"/>
  <circle cx="74" cy="60" r="20" fill="__ACC__"/>`));
writeFileSync(`${out}/X_むっくん改.svg`, wrap(mukkun()));
console.log("ok");
