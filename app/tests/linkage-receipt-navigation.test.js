import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

const StubNode = installDom();
const app = new StubNode("main");
const footer = new StubNode("span");
document.readyState = "complete";
document.getElementById = (id) => ({ app, "app-version": footer }[id] ?? null);

const data = new Map();
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, String(value)),
  removeItem: (key) => data.delete(key),
};
globalThis.location = {
  hash: "#b5=v1-342288401195267",
  href: "/#b5=v1-342288401195267",
  pathname: "/",
  search: "",
};
globalThis.history = {
  replaceState(_state, _title, url) {
    location.hash = String(url).slice(String(url).indexOf("#"));
  },
};
globalThis.addEventListener = () => {};
globalThis.scrollTo = () => {};

await import("../js/main.js");

test("結果が無い状態で連携リンクを受け取ると、トップで受取完了と次の行動を示す", () => {
  assert.equal(location.hash, "#/start", "得点入りURLが残っている");
  assert.ok(app.textContent.includes("ココロパレアの結果を受け取りました"));
  assert.ok(app.textContent.includes("45問を終えると"));
  assert.ok(app.textContent.includes("45問を始める"));
});
