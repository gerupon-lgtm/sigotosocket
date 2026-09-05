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
  const ops = [];
  const shadows = [];
  const store = {};
  const ctx = new Proxy({
    fillText: (t) => texts.push(String(t)),
    // 和文は全角として概算する。実ブラウザの実測とは異なるが、収まりの上限を見るには足りる。
    measureText: (t) => ({
      width: [...String(t)].reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0)
        * (Number(String(store.font ?? "16px").match(/(\d+(?:\.\d+)?)px/)?.[1]) || 16),
    }),
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arcTo() {}, arc() {}, translate() {}, fill() { ops.push("fill"); }, stroke() {},
    fillRect() { ops.push("fillRect"); }, strokeRect() { ops.push("strokeRect"); }, setLineDash() {},
    drawImage() { ops.push("drawImage"); },
  }, {
    get: (target, prop) => (prop in target ? target[prop] : store[prop]),
    set: (target, prop, value) => {
      store[prop] = value;
      if (prop === "shadowColor") shadows.push(value);
      return true;
    },
  });
  return { canvas: { width: 0, height: 0, getContext: () => ctx }, texts, ops, shadows };
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
  // アプリ名は字間を広げるため1文字ずつ描くので、区切りなしで連結して確かめる
  assert.ok(texts.join("").includes("シゴトソケット"), "アプリ名が描かれていない");
  assert.ok(joined.includes("医学的・心理学的な診断ではありません"));
  assert.ok(joined.includes("パブリックドメイン"));
});

test("判定不能でもカードは生成できる", async () => {
  const { canvas, texts } = stubCanvas();
  await renderCard(canvas, snapshotFor(uniformAnswers(3)));
  assert.ok(texts.join("|").includes("称号を決められませんでした"));
});

test("キャラクター画像が未制作でもカードが壊れない", async () => {
  const { canvas, texts } = stubCanvas();
  await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
  assert.ok(texts.join("|").includes("キャラクター画像は準備中です"));
});

test("キャラクター本体には縁取りを描かない（本人決定・要件定義書 §11-0）", async () => {
  const { canvas, shadows } = stubCanvas();
  await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
  // アセット未制作の状態では小物も描かないので、影の設定は一度も起きない
  assert.deepEqual(shadows, []);
});

test("視認性補助の判定そのものは決定的に残っている", async () => {
  const { resolveVisibilityAid, DEFAULT_SUBJECT_TONES } = await import("../js/domain/visibility-aid.js");
  const { LAYOUT } = await import("../js/presentation/card-layout.js");
  const aid = resolveVisibilityAid(LAYOUT.palette.background, DEFAULT_SUBJECT_TONES);
  // 判定は純関数として生きている。何をどう描くかは実装の裁量（変更禁止事項9の改訂）。
  assert.equal(aid.level, "outline");
  assert.equal(aid.shadow, true);
  assert.equal(aid.plateColor, null, "片側だけ沈む場合はプレートを敷かない");
});

test("ホランド型の行がカードに出る", async () => {
  const { canvas, texts } = stubCanvas();
  await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
  assert.ok(texts.some((t) => t.startsWith("ホランド型：") || t === "ホランドの6類型の外にある領域"),
    "ホランド型の行が見つからない");
});

test("マークの点灯位置とレーダーの上位2領域が同じ配列から導かれる", async () => {
  const { litIndexesFor } = await import("../js/infrastructure/card-renderer.js");
  const { SCALE_ORDER } = await import("../js/data/scale-order.js");
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const expected = snapshot.rank.slice(0, 2).map((id) => SCALE_ORDER.indexOf(id));
  assert.deepEqual(litIndexesFor(snapshot.rank), expected);
  assert.deepEqual(litIndexesFor(null), []);
});

/** document.fonts を差し替える。戻り値を呼ぶと元に戻る。 */
function withFonts(fonts) {
  const had = "fonts" in document;
  const previous = document.fonts;
  document.fonts = fonts;
  return () => { if (had) document.fonts = previous; else delete document.fonts; };
}

test("同梱の明朝を読み込んでから描く（1文字目が端末の明朝で焼き付くのを防ぐ）", async () => {
  const log = [];
  const restore = withFonts({
    load: async (spec) => { log.push(`load:${spec}`); return []; },
  });
  try {
    const { canvas, texts } = stubCanvas();
    const original = texts.push.bind(texts);
    texts.push = (value) => { log.push("fillText"); return original(value); };
    await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
    const loads = log.filter((entry) => entry.startsWith("load:"));
    assert.ok(loads.length > 0, "フォントを読み込んでいない");
    assert.ok(loads.every((entry) => entry.includes("Sigotosocket Mincho")),
      `同梱フォントを指していない: ${loads.join(" / ")}`);
    assert.ok(log.indexOf("fillText") > log.lastIndexOf(loads.at(-1)),
      "フォントの読み込みより先に文字を描いている");
  } finally {
    restore();
  }
});

test("フォントAPIが無い環境でもカードは描ける", async () => {
  const restore = withFonts(undefined);
  try {
    const { canvas, texts } = stubCanvas();
    await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
    assert.ok(texts.join("|").includes("医学的・心理学的な診断ではありません"));
  } finally {
    restore();
  }
});

test("フォントの読み込みに失敗してもカードは描ける", async () => {
  const restore = withFonts({ load: async () => { throw new Error("NETWORK"); } });
  try {
    const { canvas, texts } = stubCanvas();
    await renderCard(canvas, snapshotFor(answersWith((_, i) => (i % 5) + 1)));
    assert.ok(texts.join("|").includes("医学的・心理学的な診断ではありません"));
  } finally {
    restore();
  }
});

/** 画像が読めた体にする。読み込みを求められたパスを記録する。 */
function withImage(requested) {
  const had = "Image" in globalThis;
  const previous = globalThis.Image;
  globalThis.Image = class {
    constructor() { this.width = 1024; this.height = 1024; }
    set src(value) { requested.push(value); queueMicrotask(() => this.onload?.()); }
  };
  return () => { if (had) globalThis.Image = previous; else delete globalThis.Image; };
}

test("アセットのパスとキャラクターの説明を manifest から引く", async () => {
  const { poseFor, propFor } = await import("../js/data/character-manifest.js");
  const requested = [];
  const restore = withImage(requested);
  try {
    const { canvas, ops } = stubCanvas();
    const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
    const { alt } = await renderCard(canvas, snapshot);
    const pose = poseFor(snapshot.poseScaleId);
    const prop = propFor(snapshot.propScaleId);
    assert.deepEqual(requested, [pose.imagePath, prop.imagePath]);
    assert.ok(ops.includes("drawImage"), "画像を描いていない");
    assert.ok(alt.includes(pose.alt), `altにポーズの説明がない: ${alt}`);
    assert.ok(alt.includes(prop.alt), `altに小物の説明がない: ${alt}`);
  } finally {
    restore();
  }
});

test("画像を出せなかったときは、居ないキャラクターをaltで説明しない", async () => {
  const { canvas } = stubCanvas();
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const { alt } = await renderCard(canvas, snapshot);  // Image が無い環境
  assert.ok(!alt.includes("ハリネズミ"), `描いていないのに説明している: ${alt}`);
  assert.ok(alt.includes("シゴトソケット"), "カードの説明になっていない");
});

test("判定不能のカードは中立ポーズを描く（小物は無し）", async () => {
  const { poseFor } = await import("../js/data/character-manifest.js");
  const requested = [];
  const restore = withImage(requested);
  try {
    const { canvas, texts } = stubCanvas();
    const snapshot = snapshotFor(uniformAnswers(3));
    assert.equal(snapshot.poseScaleId, null, "判定不能の前提が崩れている");
    const { alt } = await renderCard(canvas, snapshot);
    assert.deepEqual(requested, [poseFor("neutral").imagePath], "中立ポーズを描いていない");
    assert.ok(!texts.join("|").includes("準備中"),
      "アセットがあるのに「準備中」の枠を出している");
    assert.ok(alt.includes(poseFor("neutral").alt));
  } finally {
    restore();
  }
});
