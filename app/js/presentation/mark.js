/**
 * シゴトソケットのマーク。8つの差し込み口のうち、上位2領域だけが点灯する。
 * アイコン・カード・画面内で同じ幾何を使うため、生成をここに一本化する。
 * 点灯位置は SCALE_ORDER の並び順に対応し、12時から時計回りに配置する。
 */
export const MARK = Object.freeze({
  viewBox: 120,
  tile: "#1f3a5f",
  unlit: "#f4ecdd",
  // 先頭が1位。赤みの強い側（R−G が大きい側）を1位に置く。
  lit: Object.freeze(["#DF7F68", "#F0B06C"]),
  ringRadius: 33,
  holeRadius: 11,
  corner: 28,
});

/** 12時を0として時計回りに i 番目の口の中心座標 */
export function holeCenter(index) {
  const a = ((-90 + 45 * index) * Math.PI) / 180;
  const c = MARK.viewBox / 2;
  return { x: c + MARK.ringRadius * Math.cos(a), y: c + MARK.ringRadius * Math.sin(a) };
}

/**
 * @param {number[]} litIndexes 点灯させる口の番号。先頭が1位、2番目が2位。
 * @returns {string} SVG文字列
 */
export function buildMarkSvg(litIndexes = [7, 0], { size = null, title = "シゴトソケット" } = {}) {
  const v = MARK.viewBox;
  const attrs = size ? ` width="${size}" height="${size}"` : "";
  const holes = [];
  for (let i = 0; i < 8; i += 1) {
    const { x, y } = holeCenter(i);
    const rank = litIndexes.indexOf(i);
    const fill = rank >= 0 ? MARK.lit[rank] ?? MARK.lit[MARK.lit.length - 1] : MARK.unlit;
    holes.push(`  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${MARK.holeRadius}" fill="${fill}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v} ${v}"${attrs} role="img" aria-label="${title}">
  <rect x="2" y="2" width="${v - 4}" height="${v - 4}" rx="${MARK.corner}" fill="${MARK.tile}"/>
${holes.join("\n")}
</svg>
`;
}

/** 角丸の矩形パス。ctx.roundRect の対応差を避けて自前で引く。 */
function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * マークを canvas へ描く。SVG版（buildMarkSvg）と同じ幾何を使う。
 * @param {number[]} litIndexes 点灯させる口の番号。先頭が1位。
 */
export function drawMark(ctx, { x, y, size, litIndexes = [] }) {
  const k = size / MARK.viewBox;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = MARK.tile;
  roundedRectPath(ctx, 2 * k, 2 * k, (MARK.viewBox - 4) * k, (MARK.viewBox - 4) * k, MARK.corner * k);
  ctx.fill();
  for (let i = 0; i < 8; i += 1) {
    const c = holeCenter(i);
    const rank = litIndexes.indexOf(i);
    ctx.fillStyle = rank >= 0 ? (MARK.lit[rank] ?? MARK.lit[MARK.lit.length - 1]) : MARK.unlit;
    ctx.beginPath();
    ctx.arc(c.x * k, c.y * k, MARK.holeRadius * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export { roundedRectPath };
