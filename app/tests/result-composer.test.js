import test from "node:test";
import assert from "node:assert/strict";
import { SCALE_ORDER } from "../js/data/scale-order.js";
import { TypeDefinitions } from "../js/data/type-definitions.js";
import { buildTypeId } from "../js/domain/type-classifier.js";
import { composeResultText, FORBIDDEN_PHRASES } from "../js/domain/result-composer.js";

test("タイプ定義は28件・名前が重複しない", () => {
  assert.equal(TypeDefinitions.length, 28);
  const names = TypeDefinitions.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  for (const type of TypeDefinitions) {
    assert.ok(type.name.length > 0 && type.lead.length > 0, type.typeId);
  }
});

test("全28タイプの結果文に集団比較の表現が混入しない", () => {
  for (const type of TypeDefinitions) {
    const rest = SCALE_ORDER.filter((id) => !type.scaleIds.includes(id));
    const rank = [...type.scaleIds, ...rest];
    const text = composeResultText({
      standardizable: true, rank, primaryTypeId: type.typeId, alternativeTypeId: null,
    });
    const joined = [text.headline, ...text.paragraphs].join("");
    for (const phrase of FORBIDDEN_PHRASES) {
      assert.ok(!joined.includes(phrase), `${type.typeId} に禁止語「${phrase}」`);
    }
  }
});

test("僅差のときは2つ目の読み方を併記する", () => {
  const rank = [...SCALE_ORDER];
  const text = composeResultText({
    standardizable: true, rank,
    primaryTypeId: buildTypeId(rank[0], rank[1]),
    alternativeTypeId: buildTypeId(rank[0], rank[2]),
  });
  assert.ok(text.alternativeHeadline);
  assert.ok(text.paragraphs.some((p) => p.includes("もうひとつの読み方")));
});

test("判定不能でも専用の文が返り、例外にならない", () => {
  const text = composeResultText({ standardizable: false, rank: null, primaryTypeId: null, alternativeTypeId: null });
  assert.ok(text.headline.length > 0);
  assert.ok(text.paragraphs.length >= 2);
  assert.equal(text.alternativeHeadline, null);
});
