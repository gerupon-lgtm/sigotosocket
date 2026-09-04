import test from "node:test";
import assert from "node:assert/strict";
import { ItemMaster } from "../js/data/item-master.js";
import {
  createResponseState, withAnswer, withIndex, isComplete,
  firstUnansweredIndex, answeredCount, TOTAL_ITEM_COUNT, itemAt,
} from "../js/domain/response-state.js";
import { uniformAnswers } from "./helpers.js";

test("壊れた保存データを読み込んでも安全な初期状態になる", () => {
  const state = createResponseState({ answers: { unknown: 9, [ItemMaster[0].id]: 99 }, currentIndex: 999 });
  assert.equal(answeredCount(state), 0);
  assert.equal(state.currentIndex, TOTAL_ITEM_COUNT - 1);
  assert.equal(createResponseState(null).currentIndex, 0);
});

test("回答の追加と位置の移動", () => {
  let state = createResponseState(null);
  state = withAnswer(state, ItemMaster[0].id, 4);
  assert.equal(state.answers[ItemMaster[0].id], 4);
  assert.equal(answeredCount(state), 1);
  assert.throws(() => withAnswer(state, "nope", 3), /RESPONSE_ITEM_UNKNOWN/);
  assert.throws(() => withAnswer(state, ItemMaster[0].id, 0), /RESPONSE_ANSWER_INVALID/);
  assert.throws(() => withIndex(state, TOTAL_ITEM_COUNT), /RESPONSE_INDEX_INVALID/);
});

test("未回答が1件でもあれば完了しない", () => {
  const answers = uniformAnswers(3);
  delete answers[ItemMaster[10].id];
  const partial = createResponseState({ answers, currentIndex: 0 });
  assert.equal(isComplete(partial), false);
  assert.equal(firstUnansweredIndex(partial), 10);
  const full = createResponseState({ answers: uniformAnswers(3), currentIndex: 0 });
  assert.equal(isComplete(full), true);
  assert.equal(firstUnansweredIndex(full), TOTAL_ITEM_COUNT - 1);
});

test("itemAt は出題順の項目を返す", () => {
  assert.equal(itemAt(0).id, ItemMaster[0].id);
  assert.equal(itemAt(TOTAL_ITEM_COUNT - 1).id, ItemMaster[TOTAL_ITEM_COUNT - 1].id);
});
