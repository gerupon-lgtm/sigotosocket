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
globalThis.location = { hash: "#/start", href: "/#/start", pathname: "/", search: "" };
globalThis.history = { replaceState() {} };
globalThis.addEventListener = () => {};
const scrolls = [];
globalThis.scrollTo = (...args) => scrolls.push(args);

const { render } = await import("../js/main.js");

test("出典・免責画面へ遷移したときも縦スクロール位置を先頭へ戻す", () => {
  scrolls.length = 0;
  render();
  location.hash = "#/about";
  render();

  assert.ok(app.textContent.includes("この診断について"));
  assert.deepEqual(scrolls, [
    [{ top: 0, left: 0, behavior: "auto" }],
    [{ top: 0, left: 0, behavior: "auto" }],
  ]);
});
