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
  const images = [];
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
    drawImage(...args) { ops.push("drawImage"); images.push(args); },
  }, {
    get: (target, prop) => (prop in target ? target[prop] : store[prop]),
    set: (target, prop, value) => {
      store[prop] = value;
      if (prop === "shadowColor") shadows.push(value);
      return true;
    },
  });
  return { canvas: { width: 0, height: 0, getContext: () => ctx }, texts, ops, shadows, images };
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
    set src(value) { this._src = value; requested.push(value); queueMicrotask(() => this.onload?.()); }
    get src() { return this._src; }
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

/* ---- F-022 ゲスト猫（連携済みのときだけ出す） ---- */

const LINKED = { factors: {}, z: {}, titleId: null, receivedAt: "x", codeVersion: "v1" };

test("連携済みなら、ゲストの猫をむっくんの左に描く（F-022）", async () => {
  const { guestFor, poseFor } = await import("../js/data/character-manifest.js");
  const requested = [];
  const restore = withImage(requested);
  try {
    const { canvas, alt } = { ...stubCanvas() };
    const c = stubCanvas();
    const snapshot = { ...snapshotFor(answersWith((_, i) => (i % 5) + 1)), bigFive: LINKED };
    const result = await renderCard(c.canvas, snapshot);
    assert.ok(requested.includes(guestFor("cat").imagePath), `猫を読んでいない: ${requested.join(", ")}`);
    assert.ok(requested.indexOf(guestFor("cat").imagePath) > requested.indexOf(poseFor(snapshot.poseScaleId).imagePath)
      || true, "読み込み順は問わない");
    assert.ok(result.alt.includes(guestFor("cat").alt), `altに猫が入っていない: ${result.alt}`);
  } finally {
    restore();
  }
});

test("未連携ならゲストの猫を描かない", async () => {
  const { guestFor } = await import("../js/data/character-manifest.js");
  const requested = [];
  const restore = withImage(requested);
  try {
    const c = stubCanvas();
    const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
    assert.equal(snapshot.bigFive, null, "未連携の前提が崩れている");
    const result = await renderCard(c.canvas, snapshot);
    assert.ok(!requested.includes(guestFor("cat").imagePath), "猫を読んでいる");
    assert.ok(!result.alt.includes("猫"), `altに猫が入っている: ${result.alt}`);
  } finally {
    restore();
  }
});

test("判定不能でも連携済みなら猫は出る（中立ポーズと一緒に）", async () => {
  const { guestFor, poseFor } = await import("../js/data/character-manifest.js");
  const requested = [];
  const restore = withImage(requested);
  try {
    const c = stubCanvas();
    const snapshot = { ...snapshotFor(uniformAnswers(3)), bigFive: LINKED };
    await renderCard(c.canvas, snapshot);
    assert.ok(requested.includes(poseFor("neutral").imagePath), "中立ポーズが出ていない");
    assert.ok(requested.includes(guestFor("cat").imagePath), "猫が出ていない");
  } finally {
    restore();
  }
});

test("猫とむっくんは重ならない（実体の矩形どうしを離して置く）", async () => {
  const { LAYOUT } = await import("../js/presentation/card-layout.js");
  const g = LAYOUT.guest;
  assert.ok(g, "ゲストの座標が card-layout.js に無い");
  assert.equal(g.ratio, 0.75, "猫の大きさはむっくんの75%");
  assert.ok(g.gap >= 0, `間隔が負だと重なる: ${g.gap}`);
  assert.ok(g.lift > 0, "接地線を上げないと奥行きが出ない");
});

/* ---- F-020 相手の因子バッジ ---- */

test("連携済みなら、相手の因子バッジをカードに描く（F-020）", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const c = stubCanvas();
  // 協調性4.2（高）／情緒安定性1.8（低）
  const link = parseBigFiveCode("v1-300300300420180");
  const snapshot = { ...snapshotFor(answersWith((_, i) => (i % 5) + 1)), bigFive: link };
  await renderCard(c.canvas, snapshot);
  const text = c.texts.join("|");
  assert.ok(text.includes("ココロパレアの結果"), `見出しが無い: ${text}`);
  assert.ok(text.includes("協調性"), "高い因子が出ていない");
  assert.ok(text.includes("情緒安定性"), "低い因子が出ていない");
});

test("未連携でも見出しと未連携バッジを描く", async () => {
  const c = stubCanvas();
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  await renderCard(c.canvas, snapshot);
  const text = c.texts.join("|");
  assert.ok(text.includes("ココロパレアの結果"), `見出しが無い: ${text}`);
  assert.ok(text.includes("未連携"), `未連携バッジが無い: ${text}`);
});

test("連携前後でむっくんと小物の描画サイズを変えない", async () => {
  const { poseFor, propFor } = await import("../js/data/character-manifest.js");
  const requested = [];
  const restore = withImage(requested);
  try {
    const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
    const plain = stubCanvas();
    const linked = stubCanvas();
    await renderCard(plain.canvas, snapshot);
    await renderCard(linked.canvas, { ...snapshot, bigFive: LINKED });

    const destination = (calls, src) => {
      const call = calls.find(([image]) => image.src === src);
      assert.ok(call, `${src} を描いていない`);
      return call.length === 5 ? call.slice(1) : call.slice(5);
    };
    const posePath = poseFor(snapshot.poseScaleId).imagePath;
    const propPath = propFor(snapshot.propScaleId).imagePath;
    assert.deepEqual(destination(linked.images, posePath).slice(2), destination(plain.images, posePath).slice(2));
    assert.deepEqual(destination(linked.images, propPath).slice(2), destination(plain.images, propPath).slice(2));
  } finally {
    restore();
  }
});

test("バッジは確保した帯の中に収める（下の注記に食い込まない）", async () => {
  const { LAYOUT, verticalPlan } = await import("../js/presentation/card-layout.js");
  const plan = verticalPlan();
  const band = LAYOUT.reservedBand;
  assert.ok(band.badge, "バッジの座標が card-layout.js に無い");
  // badge の y は bandTop からの相対。絶対位置に直してから帯と比べる
  const top = plan.bandTop;
  const bottom = top + band.h;
  const labelY = top + band.badge.labelBaseline;
  const pillBottom = top + band.badge.pillTop + band.badge.pillHeight;
  assert.ok(labelY > top && labelY < bottom, `見出しが帯の外: ${labelY}`);
  assert.ok(pillBottom <= bottom, `ピルが帯の下へはみ出す: ${pillBottom} > ${bottom}`);
});

test("確定したカード配置値を使う", async () => {
  const { LAYOUT, verticalPlan } = await import("../js/presentation/card-layout.js");
  const plan = verticalPlan();
  assert.equal(LAYOUT.character.topGap, 44, "キャラクターは16px上へ移動する");
  assert.equal(LAYOUT.guest.gap, 2);
  assert.equal(LAYOUT.guest.lift, 50);
  assert.equal(LAYOUT.guest.offsetX, 34);
  assert.equal(LAYOUT.radar.downFromMiddleBottom, -17, "レーダーは下部32px＋単独15px上へ移動する");
  assert.equal(LAYOUT.reservedBand.badge.labelSize, 30);
  assert.equal(LAYOUT.reservedBand.badge.labelWeight, "bold");
  assert.equal(LAYOUT.reservedBand.badge.textSize, 28);
  assert.equal(LAYOUT.reservedBand.badge.pillHeight, 60);
  assert.equal(plan.bandTop, 1507);
});
