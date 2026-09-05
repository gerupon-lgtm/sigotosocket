import { el } from "./screen-helpers.js";
import { LAYOUT } from "./card-layout.js";
import { poseFor, propFor } from "../data/character-manifest.js";

/**
 * 結果画面のキャラクター（ポーズ＋小物）。ココロパレアの結果画面に合わせて置く。
 *
 * **カードと同じ絵・同じ組み合わせ・同じ比率で出す。**画面とカードで違う姿が出ると、
 * どちらが本当の結果なのか分からなくなる。比率は `card-layout.js` から取り、
 * ここに数値を直書きしない（カードの構図を変えたら画面も一緒に動く）。
 *
 * **読み上げは描けたものだけを言う。**小物の画像が出せなかったときに小物を説明すると、
 * 読み上げだけが実物と食い違う（`card-renderer.js` の `cardAltText` と同じ姿勢）。
 */

/** 小物の大きさと張り出し。カードの `character` の比率をそのまま使う。 */
const PROP_SIZE_RATIO = LAYOUT.character.prop.size / LAYOUT.character.size;
const PROP_OVERHANG_RATIO = LAYOUT.character.prop.offsetX / LAYOUT.character.size;

function percent(ratio) {
  return `${(ratio * 100).toFixed(2)}%`;
}

/**
 * @param {{poseScaleId: string|null, propScaleId: string|null}} snapshot
 * @returns {HTMLElement|null} ポーズが引けなければ null（節ごと出さない）
 */
export function characterFigure(snapshot) {
  // 判定不能でも姿は出す。カードと同じく neutral へ落とす。
  const pose = poseFor(snapshot?.poseScaleId ?? "neutral");
  if (!pose) return null;
  const prop = snapshot?.propScaleId ? propFor(snapshot.propScaleId) : null;

  const altWith = (withProp) => (withProp && prop ? `${pose.alt}と、${prop.alt}` : pose.alt);
  const fallback = el("p", { class: "character-fallback", text: altWith(true) });
  const figure = el("div", {
    class: "character-figure", role: "img", "aria-label": altWith(true),
  }, [fallback]);

  const poseImage = el("img", {
    class: "character-pose", src: pose.imagePath, alt: "", decoding: "async",
    width: pose.width, height: pose.height,
  });
  // 画像が出せたときだけ説明文を引っ込める。出せなければ文字で読める経路が残る。
  poseImage.addEventListener("load", () => { fallback.hidden = true; });
  poseImage.addEventListener("error", () => { poseImage.remove(); });
  figure.appendChild(poseImage);

  if (prop) {
    const propImage = el("img", {
      class: "character-prop", src: prop.imagePath, alt: "", decoding: "async",
      width: prop.width, height: prop.height,
    });
    // 比率は card-layout.js から来る。CSSに数値を持たせると2か所を直すことになる。
    // **style属性ではなく `style` プロパティで入れる。**index.html の CSP が
    // `style-src 'self'` なので、style属性はブラウザに無視される（CSSOM は通る）。
    propImage.style.width = percent(PROP_SIZE_RATIO);
    propImage.style.right = `-${percent(PROP_OVERHANG_RATIO)}`;
    propImage.addEventListener("error", () => {
      propImage.remove();
      // 小物が出せなかったので、説明からも外す。
      figure.setAttribute("aria-label", altWith(false));
      fallback.textContent = altWith(false);
    });
    figure.appendChild(propImage);
  }

  return figure;
}
