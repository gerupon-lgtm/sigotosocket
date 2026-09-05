import test from "node:test";
import assert from "node:assert/strict";
import { hollandCardLine, hollandResultLines } from "../js/domain/holland.js";
import { ScaleDefinitions, ScaleById } from "../js/data/scale-definitions.js";

test("型を持つ領域が1位なら、カードは型名の1行", () => {
  assert.equal(hollandCardLine(["leadership", "analysis"]), "ホランド型：企業的（Enterprising）");
  assert.equal(hollandCardLine(["analysis", "production"]), "ホランド型：研究的（Investigative）");
});

test("手仕事と挑戦はどちらも現実的（原典が「Realisticの分割」と明記）", () => {
  assert.equal(ScaleById.production.hollandType, "現実的（Realistic）");
  assert.equal(ScaleById.adventure.hollandType, "現実的（Realistic）");
});

test("言葉が1位でも、カードは1行で情報量を変えない", () => {
  const line = hollandCardLine(["erudition", "analysis"]);
  assert.equal(line, "ホランドの6類型の外にある領域");
  assert.ok(!line.includes("\n"));
  assert.ok(!line.includes("対応なし"), "「対応なし」とは書かない");
});

test("カードの行はどの1位でも必ず1行で返る", () => {
  for (const scale of ScaleDefinitions) {
    const line = hollandCardLine([scale.scaleId]);
    assert.equal(typeof line, "string");
    assert.ok(!line.includes("\n"), `${scale.labelJa} が複数行になっている`);
  }
});

test("判定不能なら null と空配列", () => {
  assert.equal(hollandCardLine(null), null);
  assert.equal(hollandCardLine([]), null);
  assert.deepEqual(hollandResultLines(null), []);
});

test("結果画面は、型があれば案内文を添える", () => {
  const lines = hollandResultLines(["leadership", "analysis"]);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /企業的（Enterprising）/);
  assert.match(lines[1], /調べてみてください/);
});

test("結果画面は、言葉が1位なら2位の型を参考として添える", () => {
  const lines = hollandResultLines(["erudition", "analysis"]);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /6類型の外にある/);
  assert.match(lines[1], /（参考）次に高かった「探究」は「研究的（Investigative）」/);
});

test("言葉が1位で2位が無いときは注記だけ", () => {
  assert.deepEqual(hollandResultLines(["erudition"]), [ScaleById.erudition.hollandNote]);
});

test("職業名を出さない", () => {
  const forbidden = ["翻訳", "編集", "司書", "適職", "向いている職業"];
  const all = [...ScaleDefinitions.map((s) => hollandCardLine([s.scaleId])),
    ...ScaleDefinitions.flatMap((s) => hollandResultLines([s.scaleId, "analysis"]))].join(" ");
  for (const word of forbidden) assert.ok(!all.includes(word), `${word} が含まれている`);
});
