import test from "node:test";
import assert from "node:assert/strict";
import { createStore, STORAGE_KEY, STORAGE_STATUS } from "../js/infrastructure/progress-storage.js";
import { createMemoryStorage } from "./helpers.js";

test("進捗と結果を保存・復元できる", () => {
  const storage = createMemoryStorage();
  const store = createStore({ storage });
  store.saveProgress({ answers: { a: 1 }, currentIndex: 2 });
  assert.equal(store.status, STORAGE_STATUS.OK);
  assert.deepEqual(createStore({ storage }).load().progress, { answers: { a: 1 }, currentIndex: 2 });
  store.saveResult({ resultId: "r1" });
  assert.equal(store.latestResult().resultId, "r1");
  assert.equal(store.load().progress, null, "結果の保存で進捗は消える");
});

test("localStorageが使えなくても例外を投げずメモリで動く", () => {
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  const store = createStore({ storage: broken });
  assert.equal(store.status, STORAGE_STATUS.UNAVAILABLE);
  assert.doesNotThrow(() => store.saveProgress({ answers: {}, currentIndex: 0 }));
  assert.deepEqual(store.load().progress, { answers: {}, currentIndex: 0 });
});

test("schemaVersion が違うデータは消さずに残し、状態で知らせる", () => {
  const storage = createMemoryStorage();
  const legacy = JSON.stringify({ schemaVersion: 999, results: [{ resultId: "old" }] });
  storage.setItem(STORAGE_KEY, legacy);
  const store = createStore({ storage });
  store.load();
  assert.equal(store.status, STORAGE_STATUS.SCHEMA_MISMATCH);
  store.saveProgress({ answers: {}, currentIndex: 0 });
  assert.equal(storage.getItem(STORAGE_KEY), legacy, "利用者のデータを黙って上書きしない");
});

test("全削除で初期状態へ戻る", () => {
  const storage = createMemoryStorage();
  const store = createStore({ storage });
  store.saveResult({ resultId: "r1" });
  store.clearAll();
  assert.equal(store.latestResult(), null);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
