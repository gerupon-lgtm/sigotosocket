import { SCALE_ORDER } from "../data/scale-order.js";
import { ScaleById } from "../data/scale-definitions.js";

const AXIS_COUNT = SCALE_ORDER.length;

/** 素点1〜5を0〜1へ。尺度の並びは正準順で固定し、回転させない。 */
function normalize(raw) {
  return Math.min(Math.max((raw - 1) / 4, 0), 1);
}

export function drawRadar(ctx, scaleScores, options = {}) {
  const {
    cx, cy, radius,
    labelColor = "#4a5b7a", gridColor = "#ccd6e4",
    fillColor = "rgba(47, 84, 134, 0.24)", strokeColor = "#2f5486",
    labelFont = "14px system-ui, sans-serif", showLabels = true,
  } = options;

  const byId = new Map(scaleScores.map((score) => [score.scaleId, score]));
  const angleFor = (i) => (-Math.PI / 2) + ((Math.PI * 2 * i) / AXIS_COUNT);

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = gridColor;
  for (let ring = 1; ring <= 4; ring += 1) {
    const r = (radius * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i < AXIS_COUNT; i += 1) {
      const a = angleFor(i);
      const x = cx + (Math.cos(a) * r);
      const y = cy + (Math.sin(a) * r);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < AXIS_COUNT; i += 1) {
    const a = angleFor(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (Math.cos(a) * radius), cy + (Math.sin(a) * radius));
    ctx.stroke();
  }

  ctx.beginPath();
  SCALE_ORDER.forEach((scaleId, i) => {
    const score = byId.get(scaleId);
    const r = radius * normalize(score ? score.raw : 1);
    const a = angleFor(i);
    const x = cx + (Math.cos(a) * r);
    const y = cy + (Math.sin(a) * r);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (showLabels) {
    ctx.fillStyle = labelColor;
    ctx.font = labelFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    SCALE_ORDER.forEach((scaleId, i) => {
      const a = angleFor(i);
      const r = radius + 22;
      ctx.fillText(ScaleById[scaleId].labelJa, cx + (Math.cos(a) * r), cy + (Math.sin(a) * r));
    });
  }
  ctx.restore();
}

/** canvas が使えない環境向けのテキスト代替。 */
export function radarTextFallback(scaleScores) {
  return SCALE_ORDER.map((scaleId) => {
    const score = scaleScores.find((s) => s.scaleId === scaleId);
    return `${ScaleById[scaleId].labelJa}: ${score ? score.raw.toFixed(2) : "-"}`;
  }).join(" / ");
}
