import { el } from "./screen-helpers.js";
import { CARD, LAYOUT } from "./card-layout.js";
import { poseFor, propFor, guestFor } from "../data/character-manifest.js";

/**
 * 結果画面のキャラクター（ポーズ＋小物、連携済みならゲストの猫も）。
 * ココロパレアの結果画面に合わせて置く。
 *
 * **カードと同じ絵・同じ組み合わせ・同じ比率で出す。**画面とカードで違う姿が出ると、
 * どちらが本当の結果なのか分からなくなる。比率は `card-layout.js` から取り、
 * ここに数値を直書きしない（カードの構図を変えたら画面も一緒に動く）。
 *
 * **猫を並べるときは実体（body）どうしで組む。**画像の箱で組むと、実体が箱に占める
 * 割合がポーズごとに違う（0.851〜1.000）ぶんだけ猫の見かけの大きさが変わり、
 * D-20 で決めた「猫＝むっくんの75%」が守れない。`card-renderer.js` の
 * `drawGuestGroup()` と同じ式をここでも使う。
 *
 * **読み上げは描けたものだけを言う。**画像が出せなかったときにそれを説明すると、
 * 読み上げだけが実物と食い違う（`card-renderer.js` の `cardAltText` と同じ姿勢）。
 */

/** 小物の大きさと張り出し。単体のときはカードの `character` の比率をそのまま使う。 */
const PROP_SIZE_RATIO = LAYOUT.character.prop.size / LAYOUT.character.size;
const PROP_OVERHANG_RATIO = LAYOUT.character.prop.offsetX / LAYOUT.character.size;

function percent(ratio) {
  return `${(ratio * 100).toFixed(2)}%`;
}

/** 画像の箱に対する実体の割合。カードの body 矩形をそのまま比に直す。 */
function bodyRatio(entry) {
  return {
    x: entry.body.x / entry.width,
    y: entry.body.y / entry.height,
    w: entry.body.w / entry.width,
    h: entry.body.h / entry.height,
  };
}

function image(className, entry, style) {
  return el("img", {
    class: className, src: entry.imagePath, alt: "", decoding: "async",
    width: entry.width, height: entry.height, style,
  });
}

/**
 * 猫と並べる配置を、むっくんの画像の一辺を1として計算する。
 * `drawGuestGroup()` と同じで、**接地線をそろえ、猫だけ `lift` ぶん上げる。**
 */
function guestPlan(pose, prop, guest) {
  const g = LAYOUT.guest;
  const p = bodyRatio(pose);
  const cat = bodyRatio(guest);

  const poseBodyH = p.h;                            // むっくんの実体の高さ（画像1辺＝1）
  const catSide = (poseBodyH * g.ratio) / cat.h;   // 猫の画像の一辺
  const catBodyW = catSide * cat.w;
  const gap = g.gap / LAYOUT.character.size;
  const lift = g.lift / LAYOUT.character.size;

  const poseBodyBottom = p.y + p.h;            // むっくんの接地線（画像上端から）
  const poseBodyLeft = catBodyW + gap;

  // 小物も未連携と同じ寸法・張り出しにする。画面では図の箱がそのまま幅になるため、
  // 小物の実体が右へ張り出すぶんまで groupWidth に含める。
  let propPlan = null;
  let rightMost = poseBodyLeft + p.w;
  if (prop) {
    const d = bodyRatio(prop);
    const propSide = LAYOUT.character.prop.size / LAYOUT.character.size;
    const propBoxLeft = 1 - propSide + (LAYOUT.character.prop.offsetX / LAYOUT.character.size);
    const propImageLeft = poseBodyLeft - p.x + propBoxLeft;
    const propBodyLeft = propImageLeft + propSide * d.x;
    const propBodyW = propSide * d.w;
    rightMost = Math.max(rightMost, propBodyLeft + propBodyW);
    propPlan = { propSide, propImageLeft, d };
  }

  const groupWidth = rightMost;
  const plan = {
    groupWidth,
    pose: { height: 1, left: (poseBodyLeft - p.x) / groupWidth, top: 0 },
    guest: {
      height: catSide,
      left: (-catSide * cat.x) / groupWidth,
      top: poseBodyBottom - lift - catSide * (cat.y + cat.h),
    },
  };

  if (propPlan) {
    const { propSide, propImageLeft } = propPlan;
    plan.prop = {
      height: propSide,
      left: propImageLeft / groupWidth,
      top: 1 - propSide,
    };
  }
  return plan;
}

/**
 * @param {{poseScaleId: string|null, propScaleId: string|null, bigFive: object|null}} snapshot
 * @returns {HTMLElement|null} ポーズが引けなければ null（節ごと出さない）
 */
export function characterFigure(snapshot) {
  // 判定不能でも姿は出す。カードと同じく neutral へ落とす。
  const pose = poseFor(snapshot?.poseScaleId ?? "neutral");
  if (!pose) return null;
  const prop = snapshot?.propScaleId ? propFor(snapshot.propScaleId) : null;
  // 連携済みのときだけ猫を出す。判断材料はカードと同じ `snapshot.bigFive`（F-022）
  const guest = snapshot?.bigFive ? guestFor("cat") : null;

  const describe = ({ withProp = true, withGuest = true } = {}) => [
    pose.alt,
    withProp && prop ? `と、${prop.alt}` : "",
    withGuest && guest ? `。となりに${guest.alt}` : "",
  ].join("");

  const fallback = el("p", { class: "character-fallback", text: describe() });
  const figure = el("div", {
    class: `character-figure${guest ? " with-guest" : ""}`,
    role: "img", "aria-label": describe(),
  }, [fallback]);

  const shown = { prop: Boolean(prop), guest: Boolean(guest) };
  const retell = () => {
    const text = describe({ withProp: shown.prop, withGuest: shown.guest });
    figure.setAttribute("aria-label", text);
    fallback.textContent = text;
  };

  const plan = guest ? guestPlan(pose, prop, guest) : null;
  if (plan) {
    figure.style.aspectRatio = `${plan.groupWidth} / 1`;
    // カードの +34px を画面幅に対する同じ比率で適用する。固定34pxにはしない。
    figure.style.left = `${(LAYOUT.guest.offsetX / CARD.width * 100).toFixed(4)}%`;
  }

  const place = (part) => (plan ? {
    height: percent(part.height), left: percent(part.left), top: percent(part.top),
  } : undefined);

  const poseImage = plan
    ? image("character-pose", pose, place(plan.pose))
    : image("character-pose", pose, {});
  // 画像が出せたときだけ説明文を引っ込める。出せなければ文字で読める経路が残る。
  poseImage.addEventListener("load", () => { fallback.hidden = true; });
  poseImage.addEventListener("error", () => { poseImage.remove(); });
  figure.appendChild(poseImage);

  if (guest) {
    const guestImage = image("character-guest", guest, place(plan.guest));
    guestImage.addEventListener("error", () => {
      guestImage.remove();
      shown.guest = false;
      retell();
    });
    figure.appendChild(guestImage);
  }

  if (prop) {
    // 比率は card-layout.js から来る。CSSに数値を持たせると2か所を直すことになる。
    const propImage = image("character-prop", prop, plan
      ? place(plan.prop)
      : { width: percent(PROP_SIZE_RATIO), right: `-${percent(PROP_OVERHANG_RATIO)}` });
    propImage.addEventListener("error", () => {
      propImage.remove();
      shown.prop = false;
      retell();
    });
    figure.appendChild(propImage);
  }

  return figure;
}
