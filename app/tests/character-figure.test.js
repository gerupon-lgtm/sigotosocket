import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { characterFigure } = await import("../js/presentation/character-figure.js");
const { LAYOUT } = await import("../js/presentation/card-layout.js");
const { poseFor, propFor } = await import("../js/data/character-manifest.js");

/** 要素の木から、指定クラスの節点を集める */
function pick(node, className) {
  return [...node.querySelectorAll(`.${className}`)];
}

test("1位の領域のポーズを出す（カードと同じ絵）", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: null });
  const poses = pick(figure, "character-pose");
  assert.equal(poses.length, 1);
  assert.equal(poses[0].getAttribute("src"), poseFor("altruism").imagePath);
});

test("2位の領域の小物も出す", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: "creativity" });
  const props = pick(figure, "character-prop");
  assert.equal(props.length, 1);
  assert.equal(props[0].getAttribute("src"), propFor("creativity").imagePath);
});

test("2位が無ければ小物を出さない", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: null });
  assert.equal(pick(figure, "character-prop").length, 0);
});

test("判定不能でも姿は出す（カードと同じく neutral へ落とす）", () => {
  const figure = characterFigure({ poseScaleId: null, propScaleId: null });
  assert.ok(figure, "判定不能で節ごと消えている");
  assert.equal(pick(figure, "character-pose")[0].getAttribute("src"), poseFor("neutral").imagePath);
});

test("小物の大きさと張り出しは card-layout.js の比率から作る（数値を2か所に置かない）", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: "creativity" });
  const { style } = pick(figure, "character-prop")[0];
  const expectedSize = (LAYOUT.character.prop.size / LAYOUT.character.size * 100).toFixed(2);
  const expectedOver = (LAYOUT.character.prop.offsetX / LAYOUT.character.size * 100).toFixed(2);
  assert.equal(style.width, `${expectedSize}%`);
  assert.equal(style.right, `-${expectedOver}%`);
});

test("寸法は style プロパティで入れる（CSPが style 属性を無視するため）", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: "creativity" });
  const prop = pick(figure, "character-prop")[0];
  assert.equal(prop.getAttribute("style"), null, "style属性に書くとCSPで効かない");
  assert.ok(prop.style.width, "style プロパティに入っていない");
});

test("画像が出せなくても、文字で読める経路を残す", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: "creativity" });
  const fallback = pick(figure, "character-fallback")[0];
  assert.ok(fallback, "説明文が無い");
  assert.ok(fallback.textContent.includes(poseFor("altruism").alt), fallback.textContent);
  assert.ok(fallback.textContent.includes(propFor("creativity").alt), fallback.textContent);
});

test("読み上げはポーズと小物の両方を言う", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: "creativity" });
  const label = figure.getAttribute("aria-label");
  assert.equal(figure.getAttribute("role"), "img");
  assert.ok(label.includes(poseFor("altruism").alt), label);
  assert.ok(label.includes(propFor("creativity").alt), label);
});

test("小物が無いときは、読み上げも小物を言わない", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: null });
  assert.equal(figure.getAttribute("aria-label"), poseFor("altruism").alt);
});
