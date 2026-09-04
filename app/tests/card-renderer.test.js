import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();
const { renderCard, CARD_SIZE } = await import("../js/infrastructure/card-renderer.js");
const { ItemMaster } = await import("../js/data/item-master.js");
const { scoreScales } = await import("../js/domain/scoring.js");
const { standardize } = await import("../js/domain/standardize.js");
const { classify } = await import("../js/domain/type-classifier.js");
const { createResultSnapshot } = await import("../js/domain/result-snapshot.js");
const { uniformAnswers, answersWith } = await import("./helpers.js");

/** 描画命令を記録するだけの2Dコンテキスト。文字とサイズの検証に使う。 */
function stubCanvas() {
  const texts = [];
  const ctx = new Proxy({
    fillText: (t) => texts.push(String(t)),
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, setLineDash() {}, drawImage() {},
  }, { get: (target, prop) => (prop in target ? target[prop] : undefined), set: () => true });
  return { canvas: { width: 0, height: 0, getContext: () => ctx }, texts };
}

function snapshotFor(answers) {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
}

test("カードは規定サイズで、タイプ名と免責を描く", async () => {
  const { canvas, texts } = stubCanvas();
  await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
  assert.equal(canvas.width, CARD_SIZE.width);
  assert.equal(canvas.height, CARD_SIZE.height);
  const joined = texts.join("|");
  assert.ok(joined.includes("シゴトソケット"));
  assert.ok(joined.includes("医学的・心理学的な診断ではありません"));
  assert.ok(joined.includes("パブリックドメイン"));
});

test("判定不能でもカードは生成できる", async () => {
  const { canvas, texts } = stubCanvas();
  await renderCard(canvas, snapshotFor(uniformAnswers(3)));
  assert.ok(texts.join("|").includes("判定できませんでした"));
});

test("キャラクター画像が未制作でもカードが壊れない", async () => {
  const { canvas, texts } = stubCanvas();
  await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
  assert.ok(texts.join("|").includes("キャラクター画像は準備中です"));
});
