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
