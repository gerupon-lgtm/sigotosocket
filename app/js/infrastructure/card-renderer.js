import { appMeta } from "../config/app-meta.js";
import { ScaleById } from "../data/scale-definitions.js";
import { TypeById, UNDETERMINED_TEXT } from "../data/type-definitions.js";
import { drawRadar } from "../presentation/radar-chart.js";

export const CARD_SIZE = Object.freeze({ width: 1080, height: 1350 });

const PALETTE = Object.freeze({
  background: "#f3f7f4",
  ink: "#19332f",
  sub: "#496b62",
  line: "#c9d8d2",
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

function drawContain(ctx, image, x, y, w, h) {
  // 縦横比を維持する。引き伸ばさない。トリミングもしない。
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + ((w - dw) / 2), y + ((h - dh) / 2), dw, dh);
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
  if (pose) {
    drawContain(ctx, pose, frame.x, frame.y, frame.w, frame.h);
    if (prop) drawContain(ctx, prop, frame.x + frame.w - 190, frame.y + frame.h - 190, 180, 180);
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

  return canvas;
}
