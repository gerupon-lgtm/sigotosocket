import { appMeta } from "../config/app-meta.js";
import { ScaleById } from "../data/scale-definitions.js";
import { TypeById, UNDETERMINED_TEXT } from "../data/type-definitions.js";
import { drawRadar } from "../presentation/radar-chart.js";
import { resolveVisibilityAid, AID_LEVEL, DEFAULT_SUBJECT_TONES } from "../domain/visibility-aid.js";

export const CARD_SIZE = Object.freeze({ width: 1080, height: 1800 });

const PALETTE = Object.freeze({
  background: "#f4f6fa",
  ink: "#1b2a44",
  sub: "#4a5b7a",
  line: "#ccd6e4",
});

/**
 * キャラクターアセット（ハリネズミのポーズ8種＋小物8点）は未制作。
 * 用意できていない場合は枠だけを描き、カード生成そのものは成立させる。
 * アセットは背景透過で書き出すこと（白背景のままだと地色の上に白い矩形が乗る）。
 */
async function loadImage(src) {
  if (typeof Image === "undefined") return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function containRect(image, x, y, w, h) {
  // 縦横比を維持する。引き伸ばさない。トリミングもしない。
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  return { x: x + ((w - dw) / 2), y: y + ((h - dh) / 2), w: dw, h: dh };
}

/**
 * 地色にキャラクターが沈まないようにする視認性補助。
 * キャラクターを再配色せず、地色も差し替えない（ココロパレアの方針を踏襲）。
 * 判定は resolveVisibilityAid が決定的に行うので、プレビューと保存画像が食い違わない。
 */
function drawSilhouette(ctx, image, rect, color, spread) {
  // 画像を塗りつぶしたシルエットを、周囲8方向へずらして重ねる＝縁取り。
  const offsets = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (dx !== 0 || dy !== 0) offsets.push([dx * spread, dy * spread]);
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (const [dx, dy] of offsets) {
    ctx.save();
    ctx.translate(rect.x + dx, rect.y + dy);
    ctx.drawImage(image, 0, 0, rect.w, rect.h);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.restore();
  }
  ctx.restore();
}

function drawWithVisibilityAid(ctx, image, frame, aid) {
  const rect = containRect(image, frame.x, frame.y, frame.w, frame.h);

  if (aid.level === AID_LEVEL.PLATE && aid.plateColor) {
    // 両側とも地色へ溶ける場合だけ、彩度を持たない中立のプレートを敷く。
    const pad = 28;
    ctx.save();
    ctx.fillStyle = aid.plateColor;
    ctx.beginPath();
    const [px, py, pw, ph, r] = [rect.x - pad, rect.y - pad, rect.w + (pad * 2), rect.h + (pad * 2), 32];
    ctx.moveTo(px + r, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, r);
    ctx.arcTo(px + pw, py + ph, px, py + ph, r);
    ctx.arcTo(px, py + ph, px, py, r);
    ctx.arcTo(px, py, px + pw, py, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (aid.outline) {
    // 明暗の二重。地色が明るくても暗くても、どちらかの線が輪郭を立てる。
    drawSilhouette(ctx, image, rect, aid.outline.dark, 7);
    drawSilhouette(ctx, image, rect, aid.outline.light, 4);
  }

  ctx.save();
  if (aid.shadow) {
    ctx.shadowColor = "rgba(27, 42, 68, 0.28)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
  }
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

export async function renderCard(canvas, snapshot) {
  canvas.width = CARD_SIZE.width;
  canvas.height = CARD_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CARD_CONTEXT_UNAVAILABLE");

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, CARD_SIZE.width, CARD_SIZE.height);

  const type = snapshot.primaryTypeId ? TypeById[snapshot.primaryTypeId] : null;
  const title = type ? type.name : UNDETERMINED_TEXT.name;

  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = "center";
  ctx.font = "bold 62px system-ui, sans-serif";
  ctx.fillText(title, CARD_SIZE.width / 2, 130);

  ctx.font = "30px system-ui, sans-serif";
  ctx.fillStyle = PALETTE.sub;
  ctx.fillText("シゴトソケット", CARD_SIZE.width / 2, 186);

  // キャラクター枠（ポーズ＝1位尺度、小物＝2位尺度）
  const poseSrc = snapshot.poseScaleId ? `assets/characters/character-pose-${snapshot.poseScaleId}.webp` : null;
  const propSrc = snapshot.propScaleId ? `assets/props/prop-${snapshot.propScaleId}.webp` : null;
  const pose = poseSrc ? await loadImage(poseSrc) : null;
  const prop = propSrc ? await loadImage(propSrc) : null;
  const frame = { x: 240, y: 220, w: 600, h: 480 };
  const aid = resolveVisibilityAid(PALETTE.background, DEFAULT_SUBJECT_TONES);
  if (pose) {
    drawWithVisibilityAid(ctx, pose, frame, aid);
    if (prop) {
      drawWithVisibilityAid(ctx, prop,
        { x: frame.x + frame.w - 190, y: frame.y + frame.h - 190, w: 180, h: 180 }, aid);
    }
  } else {
    ctx.strokeStyle = PALETTE.line;
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 3;
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.sub;
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("キャラクター画像は準備中です", CARD_SIZE.width / 2, frame.y + (frame.h / 2));
  }

  drawRadar(ctx, snapshot.scaleScores, {
    cx: CARD_SIZE.width / 2, cy: 960, radius: 190,
    labelFont: "26px system-ui, sans-serif",
  });

  // 上位2領域のバッジ（記号は第2フェーズ。MVPはテキスト）
  if (snapshot.rank) {
    ctx.font = "30px system-ui, sans-serif";
    ctx.fillStyle = PALETTE.ink;
    const badges = snapshot.rank.slice(0, 2).map((id) => ScaleById[id].labelJa).join("　/　");
    ctx.fillText(badges, CARD_SIZE.width / 2, 1230);
  }

  ctx.font = "22px system-ui, sans-serif";
  ctx.fillStyle = PALETTE.sub;
  ctx.fillText("ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです", CARD_SIZE.width / 2, 1285);
  ctx.fillText(`医学的・心理学的な診断ではありません　${appMeta.appVersion}`, CARD_SIZE.width / 2, 1318);

  return { canvas, aid };
}
