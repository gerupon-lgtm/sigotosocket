import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { characterFigure } = await import("../js/presentation/character-figure.js");
const { CARD, LAYOUT } = await import("../js/presentation/card-layout.js");
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

/* ---- 連携済みのゲスト猫（F-022・2026-09-05） ---- */

const { guestFor } = await import("../js/data/character-manifest.js");

const LINKED = { poseScaleId: "altruism", propScaleId: "creativity", bigFive: { z: {} } };

/**
 * 位置は 0.01% 刻みで入る（`percent()` が toFixed(2)）。図の高さを1とすると
 * 誤差は 1e-4 の桁。**そこまでを一致とみなす。**320pxの図で 0.03px にあたる。
 */
const CLOSE = 1e-3;
function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < CLOSE,
    `${message}: ${actual} と ${expected} が離れている`);
}

/** 図の高さ（＝むっくんの画像の一辺）を1として、実体の位置を読み直す */
function bodyBox(figure, className, entry) {
  const node = pick(figure, className)[0];
  const groupWidth = Number.parseFloat(figure.style.aspectRatio);
  const side = Number.parseFloat(node.style.height) / 100;
  const left = (Number.parseFloat(node.style.left) / 100) * groupWidth;
  const top = Number.parseFloat(node.style.top) / 100;
  return {
    left: left + side * (entry.body.x / entry.width),
    right: left + side * ((entry.body.x + entry.body.w) / entry.width),
    bottom: top + side * ((entry.body.y + entry.body.h) / entry.height),
    height: side * (entry.body.h / entry.height),
  };
}

test("連携していなければ猫を出さない", () => {
  const figure = characterFigure({ poseScaleId: "altruism", propScaleId: null, bigFive: null });
  assert.equal(pick(figure, "character-guest").length, 0);
});

test("連携済みなら猫を並べる（F-022・カードと同じ判断材料）", () => {
  const figure = characterFigure(LINKED);
  assert.equal(pick(figure, "character-guest").length, 1);
  assert.equal(pick(figure, "character-guest")[0].getAttribute("src"), guestFor("cat").imagePath);
  assert.ok(figure.className.includes("with-guest"), figure.className);
});

test("連携済みの左右位置はカードと同じ比率で右へ寄せる", () => {
  const figure = characterFigure(LINKED);
  assert.equal(figure.style.left, `${(LAYOUT.guest.offsetX / CARD.width * 100).toFixed(4)}%`);
});

test("連携前後でむっくんと小物の表示サイズを変えない", () => {
  const plain = characterFigure({ poseScaleId: "altruism", propScaleId: "creativity", bigFive: null });
  const linked = characterFigure(LINKED);
  const propRatio = (LAYOUT.character.prop.size / LAYOUT.character.size * 100).toFixed(2);
  assert.equal(pick(linked, "character-pose")[0].style.height, "100.00%");
  assert.equal(pick(linked, "character-prop")[0].style.height, `${propRatio}%`);
  assert.equal(pick(plain, "character-prop")[0].style.width, `${propRatio}%`);
});

test("猫の実体の高さは、むっくんの実体の75%（D-20）", () => {
  const figure = characterFigure(LINKED);
  const cat = bodyBox(figure, "character-guest", guestFor("cat"));
  const mukkun = bodyBox(figure, "character-pose", poseFor("altruism"));
  assertClose(cat.height / mukkun.height, LAYOUT.guest.ratio, "猫の実体の高さの比");
});

test("実体どうしを離す。**重ならない**（card-layout の gap と同値）", () => {
  const figure = characterFigure(LINKED);
  const cat = bodyBox(figure, "character-guest", guestFor("cat"));
  const mukkun = bodyBox(figure, "character-pose", poseFor("altruism"));
  const gap = mukkun.left - cat.right;
  const expected = LAYOUT.guest.gap / LAYOUT.character.size;
  assert.ok(gap > 0, `重なっている: ${gap}`);
  assertClose(gap, expected, "実体どうしの隙間");
});

test("猫だけ接地線を上げる（奥に見せる・card-layout の lift と同値）", () => {
  const figure = characterFigure(LINKED);
  const cat = bodyBox(figure, "character-guest", guestFor("cat"));
  const mukkun = bodyBox(figure, "character-pose", poseFor("altruism"));
  const lift = mukkun.bottom - cat.bottom;
  const expected = LAYOUT.guest.lift / LAYOUT.character.size;
  assert.ok(lift > 0, `猫が下がっている: ${lift}`);
  assertClose(lift, expected, "猫を上げる量");
});

test("ポーズが変わっても猫の実体は常に75%（画像の箱で組まない）", () => {
  // 実体が箱に占める割合は 0.851〜1.000 とばらつく。箱で組むと猫の大きさが揺れる
  for (const poseId of ["production", "leadership", "neutral", "analysis"]) {
    const figure = characterFigure({ poseScaleId: poseId, propScaleId: null, bigFive: { z: {} } });
    const cat = bodyBox(figure, "character-guest", guestFor("cat"));
    const mukkun = bodyBox(figure, "character-pose", poseFor(poseId));
    assertClose(cat.height / mukkun.height, LAYOUT.guest.ratio, poseId);
  }
});

test("読み上げは猫にも触れる", () => {
  const label = characterFigure(LINKED).getAttribute("aria-label");
  assert.ok(label.includes(guestFor("cat").alt), label);
});

test("8ポーズすべてで要素が図の中に収まる（はみ出して切れない）", () => {
  for (const poseId of ["production", "leadership", "creativity", "analysis", "organization", "altruism", "adventure", "erudition"]) {
    const figure = characterFigure({ poseScaleId: poseId, propScaleId: "creativity", bigFive: { z: {} } });
    const groupWidth = Number.parseFloat(figure.style.aspectRatio);
    for (const [className, entry] of [
      ["character-pose", poseFor(poseId)],
      ["character-guest", guestFor("cat")],
      ["character-prop", propFor("creativity")],
    ]) {
      const box = bodyBox(figure, className, entry);
      assert.ok(box.left >= -0.001, `${poseId}/${className} が左へはみ出す: ${box.left}`);
      assert.ok(box.right <= groupWidth + 0.001, `${poseId}/${className} が右へはみ出す: ${box.right}`);
      assert.ok(box.bottom <= 1.001, `${poseId}/${className} が下へはみ出す: ${box.bottom}`);
    }
  }
});
