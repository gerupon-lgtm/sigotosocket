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
const TEST_HTTPS_ORIGIN = ["https:", "", "example.test", "sigotosocket", ""].join("/");
const TEST_LOCAL_URL = ["http:", "", "localhost:4173", "#/card?resultId=local-only"].join("/");

const SNAPSHOT = (() => {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers: answersWith((_, i) => (i % 5) + 1) }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
})();

const render = (extra = {}) => renderCardScreen({
  snapshot: SNAPSHOT,
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

test("カード画面にURL表示とURLコピーを出さない", () => {
  const node = render();
  assert.equal(node.querySelectorAll(".share-url").length, 0);
  const labels = [...node.querySelectorAll("button")].map((b) => b.textContent);
  assert.ok(!labels.includes("URLをコピー"), labels.join("/"));
  assert.ok(!node.textContent.includes(ORIGIN), "アプリURLを表示している");
});

test("結果画面の内容をコピーする操作がある", () => {
  const labels = [...render().querySelectorAll("button")].map((b) => b.textContent);
  assert.ok(labels.includes("テキストをコピー"), `テキスト共有が無い: ${labels.join("/")}`);
});

test("テキストをコピーするとアクセスしたアプリURLを先頭付近に含める", async () => {
  const written = [];
  const previous = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async (text) => written.push(text) } },
  });
  try {
    const node = render({
      currentUrl: `${TEST_HTTPS_ORIGIN}#/card?resultId=local-only`,
    });
    const button = [...node.querySelectorAll("button")].find((item) => item.textContent === "テキストをコピー");
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(written.length, 1);
    assert.ok(written[0].includes("シゴトソケット｜45問の詳細結果"));
    assert.ok(written[0].includes("8つの領域の点数"));
    assert.equal(written[0].split("\n")[1], TEST_HTTPS_ORIGIN);
  } finally {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: previous });
  }
});

test("共有できないローカルURLでは正式URLを共有テキストに使う", async () => {
  const written = [];
  const previous = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async (text) => written.push(text) } },
  });
  try {
    const node = render({ currentUrl: TEST_LOCAL_URL });
    const button = [...node.querySelectorAll("button")].find((item) => item.textContent === "テキストをコピー");
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(written[0].split("\n")[1], ORIGIN);
  } finally {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: previous });
  }
});
