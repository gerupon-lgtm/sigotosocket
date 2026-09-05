import test from "node:test";
import assert from "node:assert/strict";
import { CARD, LAYOUT, TEXT, verticalPlan, headerLockup } from "../js/presentation/card-layout.js";
import { TypeDefinitions, UNDETERMINED_TEXT } from "../js/data/type-definitions.js";
import { ScaleDefinitions } from "../js/data/scale-definitions.js";
import { hollandCardLine } from "../js/domain/holland.js";

/**
 * 文字被りを目視で確認しない。座標から機械的に落とす。
 *
 * 幅の見積もりは「和文の文字数 × フォントサイズ」。和文は原則全角なので、
 * 実際の描画幅はこれを超えない。ラテン文字と数字は半角として数える。
 * 実行環境の書体差を吸収するための**安全側**の見積もり。
 */
const widthOf = (text, size) =>
  [...text].reduce((n, c) => n + (/[\x20-\x7E]/.test(c) ? 0.5 : 1), 0) * size;

// 和文の上下の張り出し。実測ではなく安全側に大きめを取る。
const ASCENT = 0.88, DESCENT = 0.24;
const textBox = (text, size, baseline, cx = CARD.width / 2) => {
  const w = widthOf(text, size);
  return { x: cx - w / 2, y: baseline - size * ASCENT, w, h: size * (ASCENT + DESCENT) };
};
const intersects = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const L = LAYOUT, plan = verticalPlan(), CX = CARD.width / 2;
const lockup = headerLockup(widthOf);
const longest = (key) => [...TypeDefinitions].sort((a, b) => b[key].length - a[key].length)[0][key];

/** 最長ケースで箱を並べる。称号・中立副題・ホランド型は最も長い文字列を使う。 */
function boxes() {
  const hollandLines = ScaleDefinitions.map((s) => hollandCardLine([s.scaleId]));
  const hollandLongest = hollandLines.sort((a, b) => widthOf(b, L.conclusion.hollandSize) - widthOf(a, L.conclusion.hollandSize))[0];
  const top2Longest = "段取り　/　手仕事";
  return [
    { name: "マーク", box: { x: lockup.groupX, y: L.header.markTop, w: L.header.markSize, h: L.header.markSize } },
    { name: "アプリ名", box: { x: lockup.textX, y: L.header.nameBaseline - L.header.nameSize * ASCENT, w: lockup.nameWidth, h: L.header.nameSize * (ASCENT + DESCENT) } },
    { name: "副題", box: { x: lockup.textX, y: L.header.subtitleBaseline - L.header.subtitleSize * ASCENT, w: lockup.subtitleWidth, h: L.header.subtitleSize * (ASCENT + DESCENT) } },
    { name: "区切り線", box: { x: 0, y: L.header.divider.y - L.header.divider.dotRadius, w: CARD.width, h: L.header.divider.dotRadius * 2 }, band: true },
    { name: "称号ピル", box: { x: L.title.pill.x, y: L.title.pill.y, w: L.title.pill.w, h: L.title.pill.h } },
    { name: "称号ピルの文字", box: textBox(TEXT.titlePill, L.title.pillTextSize, L.title.pillTextBaseline) },
    { name: "称号", box: textBox(longest("name"), L.title.size, L.title.baseline) },
    { name: "中立副題", box: textBox(longest("subtitle"), L.title.neutralSize, L.title.neutralBaseline) },
    { name: "キャラクター", box: { x: CX - L.character.size / 2, y: plan.charTop, w: L.character.size, h: L.character.size } },
    { name: "レーダー", box: { x: 0, y: plan.chartTop, w: CARD.width, h: plan.chartBottom - plan.chartTop }, band: true },
    { name: "上位2領域", box: textBox(top2Longest, L.conclusion.top2Size, plan.top2Baseline) },
    { name: "ホランド型", box: textBox(hollandLongest, L.conclusion.hollandSize, plan.hollandBaseline) },
    { name: "第2フェーズの帯", box: { x: L.reservedBand.x, y: plan.bandTop, w: L.reservedBand.w, h: L.reservedBand.h } },
    { name: "注記1", box: textBox(TEXT.note1, L.footer.noteSize, L.footer.note1Baseline) },
    { name: "注記2", box: textBox(TEXT.note2, L.footer.noteSize, L.footer.note2Baseline) },
    { name: "下部ピル", box: { x: L.footer.pill.x, y: L.footer.pill.y, w: L.footer.pill.w, h: L.footer.pill.h } },
    { name: "下部ピルの文字", box: textBox(TEXT.footerPill, L.footer.pillTextSize, L.footer.pillTextBaseline) },
    { name: "版数", box: textBox("v0.1.0", L.footer.versionSize, L.footer.versionBaseline) },
  ];
}

/**
 * 重なって当然の組だけを外す。**ピルとその中の文字だけ**であり、
 * ピルとその外にある文字（称号など）は対象に残す。
 */
const ALLOWED = new Set(["称号ピル|称号ピルの文字", "下部ピル|下部ピルの文字"]);

test("カードの要素どうしが重ならない（最長の文字列で）", () => {
  const list = boxes();
  const collisions = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const key = `${list[i].name}|${list[j].name}`;
      if (ALLOWED.has(key)) continue;
      if (intersects(list[i].box, list[j].box)) {
        collisions.push(`${key}（${JSON.stringify(list[i].box)} と ${JSON.stringify(list[j].box)}）`);
      }
    }
  }
  assert.deepEqual(collisions, [], `重なりがある:\n${collisions.join("\n")}`);
});

test("称号28件すべてが上限幅に収まる", () => {
  const over = [...TypeDefinitions.map((t) => t.name), UNDETERMINED_TEXT.name]
    .map((name) => ({ name, w: widthOf(name, L.title.size) }))
    .filter((x) => x.w > L.title.maxWidth);
  assert.deepEqual(over, [], `上限 ${L.title.maxWidth}px を超える称号がある`);
});

test("中立副題28件すべてが内枠に収まる", () => {
  const limit = L.frame.inner.w - 80;
  const over = [...TypeDefinitions.map((t) => t.subtitle), UNDETERMINED_TEXT.subtitle]
    .map((s) => ({ s, w: widthOf(s, L.title.neutralSize) }))
    .filter((x) => x.w > limit);
  assert.deepEqual(over, [], `内枠（余白込み ${limit}px）を超える中立副題がある`);
});

test("ホランド型の行8種すべてが内枠に収まる", () => {
  const limit = L.frame.inner.w - 80;
  const over = ScaleDefinitions
    .map((s) => hollandCardLine([s.scaleId]))
    .map((line) => ({ line, w: widthOf(line, L.conclusion.hollandSize) }))
    .filter((x) => x.w > limit);
  assert.deepEqual(over, [], `内枠を超えるホランド型の行がある`);
});

test("すべての要素が内枠の内側にある", () => {
  const f = L.frame.inner;
  const out = boxes().filter(({ box, band }) =>
    box.y < f.y || box.y + box.h > f.y + f.h || (!band && (box.x < f.x || box.x + box.w > f.x + f.w)));
  assert.deepEqual(out.map((o) => o.name), [], "内枠からはみ出す要素がある");
});

test("レーダーのラベルが横方向で内枠に収まる", () => {
  const reach = L.radar.radius + L.radar.labelGap;
  const labelHalf = Math.max(...ScaleDefinitions.map((s) => widthOf(s.labelJa, L.radar.labelSize))) / 2;
  const right = CX + reach + labelHalf;
  assert.ok(right <= L.frame.inner.x + L.frame.inner.w,
    `レーダーのラベルが内枠を超える（右端 ${right.toFixed(1)}）`);
});
