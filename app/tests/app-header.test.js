import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { appHeader } = await import("../js/presentation/app-header.js");
const { screenHeading } = await import("../js/presentation/screen-heading.js");
const { appMeta } = await import("../js/config/app-meta.js");

test("ヘッダーはアイコン・名称・副題を持つ（ココロパレアの app-header.js に合わせる）", () => {
  const header = appHeader({});
  assert.equal(header.tagName, "HEADER");

  const mark = header.querySelectorAll(".app-mark")[0];
  assert.ok(mark, "アイコンが無い");
  assert.equal(mark.tagName, "IMG");
  assert.equal(mark.getAttribute("src"), appMeta.brand.iconPath);
  assert.equal(mark.getAttribute("alt"), "", "装飾なのでaltは空にする（名称は隣のテキストが持つ）");

  assert.equal(header.querySelectorAll(".app-brand-name")[0].textContent, appMeta.brand.name);
  assert.equal(header.querySelectorAll(".app-brand-subtitle")[0].textContent, appMeta.brand.subtitle);
});

test("画面名はヘッダーに置かない（本文側の見出しが持つ）", () => {
  const header = appHeader({ screenLabel: "詳細結果" });
  assert.equal(header.querySelectorAll(".app-screen-label").length, 0);
  assert.ok(!header.textContent.includes("詳細結果"));
});

test("操作はボタンにもリンクにもできる", () => {
  let pressed = 0;
  const button = appHeader({ action: { label: "中断してトップへ", onClick: () => { pressed += 1; } } })
    .querySelectorAll(".app-header-action")[0];
  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.getAttribute("type"), "button");
  button.click();
  assert.equal(pressed, 1);

  const link = appHeader({ action: { label: "トップ画面へ", href: "#/start" } })
    .querySelectorAll(".app-header-action")[0];
  assert.equal(link.tagName, "A");
  assert.equal(link.getAttribute("href"), "#/start");
});

test("操作を渡さなければ何も出ない", () => {
  assert.equal(appHeader({}).querySelectorAll(".app-header-action").length, 0);
});

test("sticky は指定したときだけ付く", () => {
  assert.equal(appHeader({ sticky: true }).className, "app-header is-sticky");
  assert.equal(appHeader({}).className, "app-header");
});

test("見出しは英字のキッカーと日本語のタイトルの2段（ココロパレア踏襲）", () => {
  const heading = screenHeading({ kicker: "DETAIL RESULT", title: "45問の詳細結果" });
  assert.equal(heading.querySelectorAll(".screen-kicker")[0].textContent, "DETAIL RESULT");
  const title = heading.querySelectorAll(".screen-title")[0];
  assert.equal(title.tagName, "H1");
  assert.equal(title.textContent, "45問の詳細結果");
});

test("ブランドの文言は app-meta の1か所で持つ", () => {
  assert.equal(appMeta.brand.name, "シゴトソケット");
  assert.equal(appMeta.brand.subtitle, "ORVIS 自己理解支援ツール");
  assert.ok(appMeta.brand.iconPath.endsWith(".svg"));
});
