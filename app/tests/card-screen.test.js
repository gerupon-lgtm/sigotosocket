import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { renderCardScreen } = await import("../js/presentation/card-screen.js");
const { ItemMaster } = await import("../js/data/item-master.js");
const { scoreScales } = await import("../js/domain/scoring.js");
const { standardize } = await import("../js/domain/standardize.js");
const { classify } = await import("../js/domain/type-classifier.js");
const { createResultSnapshot } = await import("../js/domain/result-snapshot.js");
const { answersWith } = await import("./helpers.js");
const { appMeta } = await import("../js/config/app-meta.js");

// URLの文字列そのものは書かない。app/ 配下に外部URLの literal があると
// npm run check（外部通信ゼロの静的検査）に引っかかるため。
const ORIGIN = `${appMeta.siteOrigin}/`;

const SNAPSHOT = (() => {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers: answersWith((_, i) => (i % 5) + 1) }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
})();

const render = (extra = {}) => renderCardScreen({
  snapshot: SNAPSHOT, shareUrl: ORIGIN,
  onBack() {}, onHome() {}, ...extra,
});

test("カード画面にヘッダーと戻る導線がある", () => {
  const node = render();
  assert.equal(node.querySelectorAll(".app-brand-name")[0].textContent, "シゴトソケット");
  assert.equal(node.querySelectorAll(".screen-kicker")[0].textContent, "RESULT CARD");
  const labels = [...node.querySelectorAll("button")].map((b) => b.textContent);
  assert.ok(labels.includes("結果へ戻る"));
  assert.ok(labels.includes("トップへ戻る"));
});

test("共有するURLを、選んでコピーできる文字として画面に出す", () => {
  const node = render();
  const shown = node.querySelectorAll(".share-url")[0];
  assert.ok(shown, "URLが画面に出ていない（どこを共有すればよいか分からない）");
  assert.equal(shown.textContent, ORIGIN);
});

test("URLに回答や得点が含まれないことを書く", () => {
  const text = render().textContent;
  assert.ok(text.includes("回答や点数は含まれません"), `注記が無い: ${text}`);
});

test("URLをコピーする操作がある", () => {
  const labels = [...render().querySelectorAll("button")].map((b) => b.textContent);
  assert.ok(labels.includes("URLをコピー"), `コピー操作が無い: ${labels.join("/")}`);
});

test("共有するのは得点の入らないURL（フラグメントを持ち込まない）", () => {
  const node = renderCardScreen({
    snapshot: SNAPSHOT, shareUrl: `${ORIGIN}#b5=v1-342288401195267`,
    onBack() {}, onHome() {},
  });
  const shown = node.querySelectorAll(".share-url")[0].textContent;
  assert.ok(!shown.includes("b5="), `連携コードがURLに残っている: ${shown}`);
});
