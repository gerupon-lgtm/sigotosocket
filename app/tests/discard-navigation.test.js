import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";
import { ItemMaster } from "../js/data/item-master.js";
import { STORAGE_KEY } from "../js/infrastructure/progress-storage.js";

const StubNode = installDom();
const app = new StubNode("main");
const footer = new StubNode("span");
document.readyState = "complete";
document.getElementById = (id) => ({ app, "app-version": footer }[id] ?? null);

const data = new Map();
const savedResults = [{ resultId: "saved-result-before-discard" }];
data.set(STORAGE_KEY, JSON.stringify({
  schemaVersion: 1,
  updatedAt: "2026-09-06T04:00:00.000Z",
  progress: { answers: { [ItemMaster[0].id]: 3 }, currentIndex: 0 },
  results: savedResults,
  bigFive: null,
}));
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, String(value)),
  removeItem: (key) => data.delete(key),
};
globalThis.location = { hash: "#/answer", href: "/#/answer", pathname: "/", search: "" };
globalThis.history = { replaceState() {} };
globalThis.addEventListener = () => {};
globalThis.scrollTo = () => {};
let confirmed = false;
const prompts = [];
globalThis.confirm = (message) => {
  prompts.push(message);
  return confirmed;
};

await import(`../js/main.js?discard-navigation=${Date.now()}`);

test("T-045 F-002 confirms before discarding progress and leaves saved results untouched", () => {
  const discard = app.querySelectorAll(".danger-button")[0];
  assert.ok(discard);

  discard.click();
  let envelope = JSON.parse(data.get(STORAGE_KEY));
  assert.equal(Object.keys(envelope.progress.answers).length, 1);
  assert.equal(location.hash, "#/answer");

  confirmed = true;
  discard.click();
  envelope = JSON.parse(data.get(STORAGE_KEY));
  assert.equal(envelope.progress, null);
  assert.deepEqual(envelope.results, savedResults);
  assert.equal(location.hash, "#/start");
  assert.deepEqual(prompts, [
    "途中回答を破棄します。破棄後は復元できません。",
    "途中回答を破棄します。破棄後は復元できません。",
  ]);
});
