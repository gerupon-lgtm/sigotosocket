import { ItemMaster } from "../data/item-master.js";

export const TOTAL_ITEM_COUNT = ItemMaster.length;
const VALID_ANSWERS = new Set([1, 2, 3, 4, 5]);
const ITEM_IDS = Object.freeze(ItemMaster.map((item) => item.id));
const ITEM_ID_SET = new Set(ITEM_IDS);

export function createResponseState(source) {
  const answers = {};
  if (source && typeof source === "object" && source.answers && typeof source.answers === "object") {
    for (const [id, value] of Object.entries(source.answers)) {
      if (ITEM_ID_SET.has(id) && VALID_ANSWERS.has(value)) answers[id] = value;
    }
  }
  const rawIndex = source && Number.isInteger(source.currentIndex) ? source.currentIndex : 0;
  const currentIndex = Math.min(Math.max(rawIndex, 0), TOTAL_ITEM_COUNT - 1);
  return Object.freeze({ answers: Object.freeze(answers), currentIndex });
}

export function answeredCount(state) {
  return Object.keys(state.answers).length;
}

export function isComplete(state) {
  return ITEM_IDS.every((id) => VALID_ANSWERS.has(state.answers[id]));
}

/** 最初の未回答の位置。すべて回答済みなら最終問。 */
export function firstUnansweredIndex(state) {
  const index = ITEM_IDS.findIndex((id) => !VALID_ANSWERS.has(state.answers[id]));
  return index === -1 ? TOTAL_ITEM_COUNT - 1 : index;
}

export function withAnswer(state, itemId, value) {
  if (!ITEM_ID_SET.has(itemId)) throw new TypeError("RESPONSE_ITEM_UNKNOWN");
  if (!VALID_ANSWERS.has(value)) throw new TypeError("RESPONSE_ANSWER_INVALID");
  return Object.freeze({
    answers: Object.freeze({ ...state.answers, [itemId]: value }),
    currentIndex: state.currentIndex,
  });
}

export function withIndex(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_ITEM_COUNT) {
    throw new TypeError("RESPONSE_INDEX_INVALID");
  }
  return Object.freeze({ answers: state.answers, currentIndex: index });
}

export function itemAt(index) {
  return ItemMaster[index];
}
