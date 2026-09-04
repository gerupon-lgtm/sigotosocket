// むっくんマーク候補の生成。とげの座標を計算で出すため、SVGを手書きせずここで組み立てる。
import { writeFileSync } from "node:fs";
const out = process.argv[2];
const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// 正面向き：とげのドーム＋顔
function front() {
  const cx = 60, cy = 58, r = 37, spike = 10, n = 13;
  const pts = [];
  for (let i = 0; i <= n * 2; i += 1) {
    const t = Math.PI + (Math.PI * i) / (n * 2);      // 180°→360°
    const rr = i % 2 === 0 ? r : r + spike;
    pts.push(P(cx + rr * Math.cos(t), cy + rr * Math.sin(t)));
  }
  const dome = `M ${pts.join(" L ")} A ${r} ${r} 0 0 0 ${P(cx - r, cy)} Z`;
  return `  <path d="${dome}" fill="__ACC__"/>
  <circle cx="60" cy="76" r="25" fill="__MARK__"/>
  <circle cx="60" cy="93" r="5.5" fill="__TILE__"/>
  <circle cx="47" cy="70" r="4.5" fill="__TILE__"/>
  <circle cx="73" cy="70" r="4.5" fill="__TILE__"/>`;
}

// 横向き：背中がぎざぎざの一体シルエット
function sidePath(rx, ry, cx, cy, n, spike) {
  const pts = [];
  for (let i = 0; i <= n * 2; i += 1) {
    const t = Math.PI + (Math.PI * i) / (n * 2);
    const k = i % 2 === 0 ? 1 : 1 + spike;
    pts.push(P(cx + rx * k * Math.cos(t), cy + ry * k * Math.sin(t)));
  }
  return pts;
}
function side(twoTone) {
  const pts = sidePath(36, 30, 62, 84, 6, 0.22);
  const back = `M 26 84 L ${pts.join(" L ")} L 98 84 Z`;
  const face = `M 26 84 C 26 66 36 56 50 56 C 60 56 67 63 68 72 C 69 79 64 84 64 84 Z`;
  if (!twoTone) {
    return `  <path d="${back}" fill="__MARK__"/>
  <path d="${face}" fill="__MARK__"/>
  <circle cx="46" cy="68" r="4.5" fill="__TILE__"/>
  <circle cx="30" cy="76" r="4.5" fill="__TILE__"/>`;
  }
  return `  <path d="${back}" fill="__ACC__"/>
  <path d="${face}" fill="__MARK__"/>
  <circle cx="46" cy="68" r="4.5" fill="__TILE__"/>
  <circle cx="30" cy="76" r="4.5" fill="__TILE__"/>`;
}

const tile = `<rect x="2" y="2" width="116" height="116" rx="28" fill="__TILE__"/>`;
const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="シゴトソケット">\n  ${tile}\n${body}\n</svg>\n`;

writeFileSync(`${out}/Q_むっくん正面.svg`, wrap(front()));
writeFileSync(`${out}/R_むっくん横2色.svg`, wrap(side(true)));
writeFileSync(`${out}/S_むっくん横1色.svg`, wrap(side(false)));
console.log("generated");
