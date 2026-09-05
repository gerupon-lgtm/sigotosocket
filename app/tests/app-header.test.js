import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { appHeader } = await import("../js/presentation/app-header.js");

test("ヘッダーはブランドを2つに割って持つ（ココロパレアと同じ組み立て）", () => {
  const header = appHeader({});
  assert.equal(header.tagName, "HEADER");
  const parts = header.querySelectorAll(".app-brand-part");
  assert.equal(parts.length, 2);
  assert.equal(parts[0].textContent, "シゴトソケット｜");
  assert.equal(parts[1].textContent, "ORVIS 自己理解支援ツール");
});

test("画面名を出す。無ければ出さない", () => {
  assert.equal(appHeader({ screenLabel: "回答中" }).querySelectorAll(".app-screen-label")[0].textContent, "回答中");
  assert.equal(appHeader({}).querySelectorAll(".app-screen-label").length, 0);
});

test("操作を1つだけ右に置ける", () => {
  let pressed = 0;
  const header = appHeader({ action: { label: "中断してトップへ", onClick: () => { pressed += 1; } } });
  const buttons = header.querySelectorAll(".app-header-action");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, "中断してトップへ");
  assert.equal(buttons[0].getAttribute("type"), "button");
  buttons[0].click();
  assert.equal(pressed, 1);
});

test("操作を渡さなければボタンは出ない", () => {
  assert.equal(appHeader({ screenLabel: "詳細結果" }).querySelectorAll(".app-header-action").length, 0);
});

test("sticky は指定したときだけ付く（設問画面で使う）", () => {
  assert.equal(appHeader({ sticky: true }).className, "app-header is-sticky");
  assert.equal(appHeader({}).className, "app-header");
});
