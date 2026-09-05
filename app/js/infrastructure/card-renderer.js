import { appMeta } from "../config/app-meta.js";
import { ScaleById } from "../data/scale-definitions.js";
import { SCALE_ORDER } from "../data/scale-order.js";
import { TypeById, UNDETERMINED_TEXT } from "../data/type-definitions.js";
import { drawRadar } from "../presentation/radar-chart.js";
import { drawMark, roundedRectPath } from "../presentation/mark.js";
import { CARD, LAYOUT, TEXT, verticalPlan, headerLockup } from "../presentation/card-layout.js";
import { hollandCardLine } from "../domain/holland.js";
import { partnerBadges, badgeText } from "../domain/partner-badges.js";
import { poseFor, propFor, guestFor } from "../data/character-manifest.js";

export const CARD_SIZE = CARD;

// カードの書体はココロパレアの share-card-renderer.js に合わせる。
const SANS = '"Noto Sans JP", "Yu Gothic", sans-serif';
// 先頭は同梱のサブセット（style.css の @font-face）。称号に使う161字だけを持つので、
// それ以外の字は後ろの端末フォントへ落ちる。豆腐にはならない。
const MINCHO_SUBSET_FAMILY = "Sigotosocket Mincho";
// 明朝も同じ並びにするが、**先頭は同梱のサブセット**を残す。ココロパレアは同梱して
// いないため、明朝を持たないAndroidではゴシックに落ちる。そこはこちらの改善点。
const MINCHO = `"${MINCHO_SUBSET_FAMILY}", "Noto Serif JP", "Yu Mincho", serif`;

/**
 * キャラクターは背景透過で、**余白を切り落とした状態で配置する前提**。
 * アセット側に透明余白が残っていると、指定サイズより小さく見える。
 * 余白の除去はアセット生成の工程で行う（docs/brand/card-layout.md）。
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

function setFont(ctx, size, { family = SANS, weight = "normal" } = {}) {
  ctx.font = `${weight === "normal" ? "" : `${weight} `}${size}px ${family}`;
}

/** maxWidth に収まるまで1pxずつ縮める。称号は最長15字でも収まる想定だが、保険として持つ。 */
function fitText(ctx, text, size, minSize, maxWidth, options) {
  let current = size;
  setFont(ctx, current, options);
  while (current > minSize && ctx.measureText(text).width > maxWidth) {
    current -= 1;
    setFont(ctx, current, options);
  }
  return current;
}

/** 字間を広げて targetWidth に合わせる。measureText を1文字ずつ使う。 */
function drawTracked(ctx, text, x, baseline, targetWidth) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const natural = widths.reduce((sum, w) => sum + w, 0);
  const tracking = chars.length > 1 ? Math.max(0, targetWidth - natural) / (chars.length - 1) : 0;
  let cursor = x;
  chars.forEach((c, i) => {
    ctx.fillText(c, cursor, baseline);
    cursor += widths[i] + tracking;
  });
}

/**
 * 小物が地色に沈まないようにする。**白のやわらかい暈し**を重ねる。
 * 地色 #f4f6fa は白に近いため、白い縁は輪郭ではなく
 * 「キャラクターと小物の間に隙間を作る」役割になる（要件定義書 §11-0）。
 * ctx.filter は対応差があるため shadowBlur を重ねる方式にしている。
 */
/**
 * 縁取り（白いにじみ）を付けて描く。`rect` に sx/sy/sw/sh があれば、その範囲だけを切って使う。
 * 実体の矩形で並べるときは切り出しが要る（余白ごと描くと寸法が狂う）。
 */
function drawWithHalo(ctx, image, rect, { color, blur, passes }) {
  const draw = rect.sw
    ? () => ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.x, rect.y, rect.w, rect.h)
    : () => ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  for (let i = 0; i < passes; i += 1) draw();
  ctx.restore();
  draw();
}

function fillRounded(ctx, rect, fill, stroke) {
  roundedRectPath(ctx, rect.x, rect.y, rect.w, rect.h, rect.r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = rect.lineWidth ?? 1; ctx.stroke(); }
}

/** 上位2領域の位置。マークの点灯とレーダーの強調を同じ配列から導く（食い違い防止） */
export function litIndexesFor(rank) {
  if (!Array.isArray(rank)) return [];
  return rank.slice(0, 2).map((id) => SCALE_ORDER.indexOf(id)).filter((i) => i >= 0);
}


/**
 * 同梱の明朝（style.css の @font-face）を、描く前に読み終える。
 *
 * canvas は「いま使えるフォント」で即座に焼き付けるため、待たずに描くと初回だけ
 * 端末の明朝で保存されてしまう。フォントAPIが無い・読み込みに失敗する環境では
 * MINCHO の後ろに並べた端末フォントで描く。カードを出さない理由にはしない。
 */
async function ensureMinchoLoaded() {
  const fonts = globalThis.document?.fonts;
  if (typeof fonts?.load !== "function") return false;
  try {
    await Promise.all([LAYOUT.title.size, LAYOUT.title.pillTextSize, LAYOUT.footer.pillTextSize]
      .map((size) => fonts.load(`${size}px "${MINCHO_SUBSET_FAMILY}"`)));
    return true;
  } catch {
    return false;
  }
}

/**
 * 猫・むっくん・小物を1つの塊として中央へ置く（F-022）。
 *
 * **接地線をそろえ、猫だけ `lift` ぶん上げる。**上げることで奥に居るように見える。
 * 猫は先に描くので、順序としては奥になる。ただし矩形は `gap` ぶん離すので重ならない
 * （決めごとC-1の残す4項目のうち「覗き込み・前足を伸ばす所作」は絵の側で担保）。
 */
function drawGuestGroup(ctx, { pose, poseBody, prop, propBody, guest, guestBody, plan, CX }) {
  const c = LAYOUT.character;
  const g = LAYOUT.guest;

  // むっくんと小物は未連携時と同じ画像サイズ・描画方式を使う。
  const poseSide = c.size;
  const poseBodyW = (poseBody.w / pose.width) * poseSide;
  const poseBodyH = (poseBody.h / pose.height) * poseSide;
  const catSide = (poseBodyH * g.ratio) / (guestBody.h / guest.height);
  const catBodyW = (guestBody.w / guest.width) * catSide;
  const poseBodyLeft = catBodyW + g.gap;

  let rightMost = poseBodyLeft + poseBodyW;
  let propBoxFromPose = null;
  if (prop && propBody) {
    propBoxFromPose = {
      x: poseSide - c.prop.size + c.prop.offsetX,
      y: poseSide - c.prop.size,
      w: c.prop.size,
      h: c.prop.size,
    };
    const propBodyLeft = poseBodyLeft
      - (poseBody.x / pose.width) * poseSide
      + propBoxFromPose.x
      + (propBody.x / prop.width) * propBoxFromPose.w;
    const propBodyRight = propBodyLeft + (propBody.w / prop.width) * propBoxFromPose.w;
    rightMost = Math.max(rightMost, propBodyRight);
  }

  // 猫と（むっくん＋小物）の実体全体を基準点のまわりへ置く。
  const left = CX - rightMost / 2;
  const poseX = left + poseBodyLeft - (poseBody.x / pose.width) * poseSide;
  const poseY = plan.charTop;
  const poseBodyBottom = poseY + ((poseBody.y + poseBody.h) / pose.height) * poseSide;
  const catX = left - (guestBody.x / guest.width) * catSide;
  const catY = poseBodyBottom - g.lift
    - ((guestBody.y + guestBody.h) / guest.height) * catSide;

  ctx.drawImage(guest, catX, catY, catSide, catSide);
  ctx.drawImage(pose, poseX, poseY, poseSide, poseSide);

  if (prop && propBoxFromPose) {
    drawWithHalo(ctx, prop, {
      x: poseX + propBoxFromPose.x,
      y: poseY + propBoxFromPose.y,
      w: propBoxFromPose.w,
      h: propBoxFromPose.h,
    }, { color: c.prop.haloColor, blur: c.prop.haloBlur, passes: c.prop.haloPasses });
  }
}

/**
 * 相手（ココロパレア）の因子バッジ。**称号を作り直さず、渡された数値が
 * そのまま言えることだけを言う**（partner-badges.js）。
 */
function drawPartnerBadges(ctx, snapshot, plan, CX) {
  const badges = partnerBadges(snapshot.bigFive);
  const b = LAYOUT.reservedBand.badge;
  const P = LAYOUT.palette;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  setFont(ctx, b.labelSize, { weight: b.labelWeight });
  ctx.fillStyle = P.ink;
  ctx.fillText(badges?.heading ?? "ココロパレアの結果", CX, plan.bandTop + b.labelBaseline);

  if (!badges) {
    setFont(ctx, b.textSize, { weight: 600 });
    const text = "未連携";
    const width = ctx.measureText(text).width + b.padding * 2;
    const top = plan.bandTop + b.pillTop;
    fillRounded(ctx, { x: CX - width / 2, y: top, w: width, h: b.pillHeight, r: b.pillRadius }, P.surface, P.line);
    ctx.fillStyle = P.ink;
    ctx.fillText(text, CX, top + b.pillHeight / 2 + b.textSize * 0.36);
    return;
  }

  // ピルの幅は中の文字から決める。文字数が違っても左右の余白が揃う
  setFont(ctx, b.textSize, { weight: 600 });
  const pills = badges.items.map((item) => {
    const text = badgeText(item);
    return { text, w: ctx.measureText(text).width + b.padding * 2 };
  });

  const total = pills.reduce((sum, pill) => sum + pill.w, 0) + b.pillGap * (pills.length - 1);
  let x = CX - total / 2;
  const top = plan.bandTop + b.pillTop;

  for (const pill of pills) {
    fillRounded(ctx, { x, y: top, w: pill.w, h: b.pillHeight, r: b.pillRadius }, P.surface, P.line);
    ctx.fillStyle = P.ink;
    setFont(ctx, b.textSize, { weight: 600 });
    ctx.fillText(pill.text, x + pill.w / 2, top + b.pillHeight / 2 + b.textSize * 0.36);
    x += pill.w + b.pillGap;
  }
}

export async function renderCard(canvas, snapshot) {
  await ensureMinchoLoaded();

  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CARD_CONTEXT_UNAVAILABLE");

  const L = LAYOUT, P = L.palette, plan = verticalPlan();
  const CX = plan.centerX;

  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, CARD.width, CARD.height);

  // 外枠（二重）
  fillRounded(ctx, { ...L.frame.outer, lineWidth: L.frame.outer.lineWidth }, null, P.frameOuter);
  fillRounded(ctx, { ...L.frame.inner, lineWidth: L.frame.inner.lineWidth }, null, P.frameInner);

  // ヘッダー：マーク＋アプリ名＋副題を1つの塊として中央へ
  const h = L.header;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const lockup = headerLockup((text, size) => {
    setFont(ctx, size, size === h.nameSize ? { weight: 600 } : {});
    return [...text].reduce((sum, c) => sum + ctx.measureText(c).width, 0);
  });
  const { groupX, textX, nameWidth } = lockup;
  setFont(ctx, h.nameSize, { weight: 600 });

  drawMark(ctx, {
    x: groupX, y: h.markTop, size: h.markSize,
    litIndexes: litIndexesFor(snapshot.rank),
  });
  ctx.fillStyle = P.ink;
  drawTracked(ctx, TEXT.appName, textX, h.nameBaseline, nameWidth);
  setFont(ctx, h.subtitleSize);
  ctx.fillStyle = P.sub;
  ctx.fillText(TEXT.appSubtitle, textX, h.subtitleBaseline);

  ctx.strokeStyle = P.line;
  ctx.lineWidth = 2;
  for (const [x1, x2] of [h.divider.left, h.divider.right]) {
    ctx.beginPath();
    ctx.moveTo(x1, h.divider.y);
    ctx.lineTo(x2, h.divider.y);
    ctx.stroke();
  }
  ctx.fillStyle = P.dot;
  ctx.beginPath();
  ctx.arc(CX, h.divider.y, h.divider.dotRadius, 0, Math.PI * 2);
  ctx.fill();

  // 称号
  const t = L.title;
  fillRounded(ctx, t.pill, P.surface, P.line);
  ctx.textAlign = "center";
  setFont(ctx, t.pillTextSize, { family: MINCHO });
  ctx.fillStyle = P.ink;
  ctx.fillText(TEXT.titlePill, CX, t.pillTextBaseline);

  const type = snapshot.primaryTypeId ? TypeById[snapshot.primaryTypeId] : null;
  const title = type ? type.name : UNDETERMINED_TEXT.name;
  fitText(ctx, title, t.size, t.minSize, t.maxWidth, { family: MINCHO });
  ctx.fillStyle = P.ink;
  ctx.fillText(title, CX, t.baseline);

  setFont(ctx, t.neutralSize);
  ctx.fillStyle = P.sub;
  ctx.fillText(type ? type.subtitle : UNDETERMINED_TEXT.subtitle, CX, t.neutralBaseline);

  // キャラクター（ポーズ＝1位、小物＝2位）
  const c = L.character;
  // パスは manifest が正典。文字列で組み立てない（アセットを入れ替えたら目録が追う）。
  // 判定不能で順位が無いときは中立ポーズ。小物は2位の領域なので出さない（T-015）。
  const poseEntry = poseFor(snapshot.poseScaleId ?? "neutral");
  const propEntry = snapshot.propScaleId ? propFor(snapshot.propScaleId) : null;
  const pose = poseEntry ? await loadImage(poseEntry.imagePath) : null;
  const prop = poseEntry && propEntry ? await loadImage(propEntry.imagePath) : null;
  // 連携済みのときだけゲストを出す（F-022・D-20）。判断材料は結果に紐づいた連携。
  const guestEntry = snapshot.bigFive ? guestFor("cat") : null;
  const guest = guestEntry ? await loadImage(guestEntry.imagePath) : null;
  const charBox = { x: CX - c.size / 2, y: plan.charTop, w: c.size, h: c.size };
  if (pose && guest) {
    // 連携済み。猫とむっくん（＋小物）を1つの塊として中央へ置く（F-022・D-20）。
    // **実体の矩形で並べる。**箱で並べると余白の差だけ隙間がぶれる。
    drawGuestGroup(ctx, {
      pose, poseBody: poseEntry.body, prop, propBody: propEntry?.body,
      guest, guestBody: guestEntry.body, plan, CX: CX + L.guest.offsetX,
    });
  } else if (pose) {
    ctx.drawImage(pose, ...Object.values(containRect(pose, charBox.x, charBox.y, charBox.w, charBox.h)));
    if (prop) {
      const p = c.prop;
      const propBox = containRect(prop,
        charBox.x + charBox.w - p.size + p.offsetX, charBox.y + charBox.h - p.size, p.size, p.size);
      drawWithHalo(ctx, prop, propBox, { color: p.haloColor, blur: p.haloBlur, passes: p.haloPasses });
    }
  } else {
    ctx.strokeStyle = P.line;
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 3;
    ctx.strokeRect(charBox.x, charBox.y, charBox.w, charBox.h);
    ctx.setLineDash([]);
    ctx.fillStyle = P.sub;
    setFont(ctx, 28);
    ctx.fillText(TEXT.characterPending, CX, charBox.y + (charBox.h / 2));
  }

  // レーダー（上位2領域はここでは強調しない。強調は下の行が担う）
  const r = L.radar;
  drawRadar(ctx, snapshot.scaleScores, {
    cx: CX, cy: plan.radarCenterY, radius: r.radius,
    gridColor: r.gridColor, labelColor: r.labelColor,
    fillColor: r.fillColor, strokeColor: r.strokeColor, strokeWidth: r.strokeWidth,
    labelFont: `${r.labelSize}px ${SANS}`, labelGap: r.labelGap,
  });

  // 上位2領域とホランド型（1つの塊）
  const con = L.conclusion;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (snapshot.rank) {
    setFont(ctx, con.top2Size, { weight: con.top2Bold ? "bold" : "normal" });
    ctx.fillStyle = P.ink;
    ctx.fillText(snapshot.rank.slice(0, 2).map((id) => ScaleById[id].labelJa).join("　/　"), CX, plan.top2Baseline);
  }
  const holland = hollandCardLine(snapshot.rank);
  if (holland) {
    setFont(ctx, con.hollandSize);
    ctx.fillStyle = P.sub;
    ctx.fillText(holland, CX, plan.hollandBaseline);
  }

  // 確保しておいた帯に、相手の因子バッジまたは未連携ピルを描く（F-020）。
  drawPartnerBadges(ctx, snapshot, plan, CX);

  const f = L.footer;
  setFont(ctx, f.noteSize);
  ctx.fillStyle = P.sub;
  ctx.fillText(TEXT.note1, CX, f.note1Baseline);
  ctx.fillText(TEXT.note2, CX, f.note2Baseline);
  fillRounded(ctx, f.pill, P.surface, P.line);
  setFont(ctx, f.pillTextSize, { family: MINCHO });
  ctx.fillStyle = P.ink;
  ctx.fillText(TEXT.footerPill, CX, f.pillTextBaseline);
  ctx.save();
  ctx.globalAlpha = f.versionAlpha;
  setFont(ctx, f.versionSize);
  ctx.fillStyle = P.sub;
  ctx.fillText(appMeta.appVersion, CX, f.versionBaseline);
  ctx.restore();

  return { canvas, alt: cardAltText({ title, snapshot,
    pose: pose ? poseEntry : null, prop: prop ? propEntry : null, guest: guest ? guestEntry : null }) };
}

/**
 * カードの読み上げ文。**描けたものだけを言う。**画像が出せなかったときに
 * 居ないキャラクターを説明すると、読み上げだけが実物と食い違う。
 */
function cardAltText({ title, snapshot, pose, prop, guest }) {
  const parts = [`シゴトソケットの結果カード。称号は「${title}」。`];
  if (snapshot.rank) {
    parts.push(`高かった領域は${snapshot.rank.slice(0, 2).map((id) => ScaleById[id].labelJa).join("と")}。`);
    const holland = hollandCardLine(snapshot.rank);
    if (holland) parts.push(`${holland}。`);
  }
  if (pose) parts.push(`絵は${pose.alt}${prop ? `と、${prop.alt}` : ""}。`);
  if (guest) parts.push(`${guest.alt}が並んでいます。`);
  return parts.join("");
}
