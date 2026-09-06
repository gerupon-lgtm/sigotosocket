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
const answers = Object.fromEntries(ItemMaster.slice(0, -1).map((item) => [item.id, 3]));
data.set(STORAGE_KEY, JSON.stringify({
  schemaVersion: 1,
  updatedAt: "2026-09-06T02:00:00.000Z",
  progress: { answers, currentIndex: ItemMaster.length - 1 },
  results: [],
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

await import("../js/main.js");

test("45問目の回答後は進捗を残して確認画面に止まり、明示操作で結果を確定する", () => {
  assert.ok(app.textContent.includes("45 / 45問"));
  app.querySelectorAll(".choice")[2].click();

  assert.equal(location.hash, "#/answer");
  assert.ok(app.textContent.includes("45問の回答が完了しました"));
  let envelope = JSON.parse(data.get(STORAGE_KEY));
  assert.equal(Object.keys(envelope.progress.answers).length, 45);
  assert.equal(envelope.results.length, 0);

  app.querySelectorAll(".secondary")[0].click();
  assert.ok(app.textContent.includes(ItemMaster.at(-1).textJa));
  assert.equal(app.querySelectorAll(".choice").length, 5);
  assert.ok(app.textContent.includes("回答を完了する"));

  app.querySelectorAll(".secondary")[0].click();
  assert.ok(app.textContent.includes(ItemMaster.at(-2).textJa));
  assert.ok(app.textContent.includes("回答を完了する"));
  app.querySelectorAll(".complete-review")[0].click();
  envelope = JSON.parse(data.get(STORAGE_KEY));
  assert.equal(location.hash, "#/result");
  assert.equal(envelope.progress, null);
  assert.equal(envelope.results.length, 1);
});
