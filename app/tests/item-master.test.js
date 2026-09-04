import test from "node:test";
import assert from "node:assert/strict";
import { ItemMaster } from "../js/data/item-master.js";
import { ScaleById } from "../js/data/scale-definitions.js";
import { SCALE_ORDER } from "../js/data/scale-order.js";

test("45問・尺度別の内訳が尺度マスタと一致する", () => {
  assert.equal(ItemMaster.length, 45);
  for (const scaleId of SCALE_ORDER) {
    const actual = ItemMaster.filter((item) => item.scaleId === scaleId).length;
    assert.equal(actual, ScaleById[scaleId].itemCount, scaleId);
  }
});

test("出題順は原版の項目番号の昇順で、毎回同一である", () => {
  const ids = ItemMaster.map((item) => item.sourceItemId);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  assert.deepEqual(ItemMaster.map((i) => i.order), ItemMaster.map((_, n) => n + 1));
});

test("隣接する2問が同じ尺度にならない", () => {
  const clashes = ItemMaster
    .map((item, i) => (i > 0 && ItemMaster[i - 1].scaleId === item.scaleId ? item.id : null))
    .filter(Boolean);
  assert.deepEqual(clashes, []);
});

test("itemIdは一意で、設問文は空でない", () => {
  const ids = ItemMaster.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of ItemMaster) assert.ok(item.textJa.trim().length > 0, item.id);
});

test("ORVISに逆転項目は存在しない", () => {
  for (const item of ItemMaster) assert.equal(item.keyedDirection, "positive", item.id);
});
