import { ItemMaster } from "../js/data/item-master.js";

export function answersWith(fn) {
  return Object.fromEntries(ItemMaster.map((item, index) => [item.id, fn(item, index)]));
}
export function uniformAnswers(value) {
  return answersWith(() => value);
}
export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
}

/**
 * 指定した尺度だけ高い回答をつくる。順位を狙って決めたいテストで使う。
 * @param {Record<string, number>} byScale 尺度IDごとの回答値
 * @param {number} fallback それ以外の尺度に入れる値
 */
export function answersByScale(byScale, fallback = 1) {
  return answersWith((item) => byScale[item.scaleId] ?? fallback);
}
