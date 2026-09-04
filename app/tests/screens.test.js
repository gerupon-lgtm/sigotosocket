import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { renderStartScreen } = await import("../js/presentation/start-screen.js");
const { renderQuestionnaireScreen } = await import("../js/presentation/questionnaire-screen.js");
const { renderResultScreen } = await import("../js/presentation/result-screen.js");
const { renderAboutScreen } = await import("../js/presentation/about-screen.js");
const { createResponseState, withAnswer } = await import("../js/domain/response-state.js");
const { ItemMaster } = await import("../js/data/item-master.js");
const { scoreScales } = await import("../js/domain/scoring.js");
const { standardize } = await import("../js/domain/standardize.js");
const { classify } = await import("../js/domain/type-classifier.js");
const { createResultSnapshot } = await import("../js/domain/result-snapshot.js");
const { STORAGE_STATUS } = await import("../js/infrastructure/progress-storage.js");
const { uniformAnswers, answersWith } = await import("./helpers.js");

function snapshotFor(answers) {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
}

test("トップは所要時間と設問数を出し、保存データがなければ「続きから」を出さない", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const text = node.textContent;
  assert.ok(text.includes("45問"));
  assert.ok(text.includes("5分"));
  assert.ok(!text.includes("続きから"));
});

test("途中まで回答していれば「続きから」が出る", () => {
  const state = withAnswer(createResponseState(null), ItemMaster[0].id, 4);
  const node = renderStartScreen({
    progressState: state, latestResult: null, storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  assert.ok(node.textContent.includes("続きから（1 / 45問）"));
});

test("保存できない環境では通知を出す", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.UNAVAILABLE,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  assert.ok(node.textContent.includes("保存できない"));
});

test("設問は1問1画面。1問目では戻るが無効", () => {
  const node = renderQuestionnaireScreen({
    state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit() {},
  });
  assert.ok(node.textContent.includes("1 / 45問"));
  assert.ok(node.textContent.includes(ItemMaster[0].textJa));
  const back = node.querySelectorAll(".secondary")[0];
  assert.equal(back.getAttribute("disabled"), "");
  assert.equal(node.querySelectorAll(".choice").length, 5);
});

test("選択肢を押すと itemId と値が渡る", () => {
  let received = null;
  const node = renderQuestionnaireScreen({
    state: createResponseState(null),
    onAnswer(id, value) { received = [id, value]; },
    onBack() {}, onQuit() {},
  });
  node.querySelectorAll(".choice")[4].click();
  assert.deepEqual(received, [ItemMaster[0].id, 5]);
});

test("結果画面はタイプ名・数値・免責を出す", () => {
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const node = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} });
  const text = node.textContent;
  assert.ok(text.includes("医学的・心理学的な検査ではありません"));
  assert.ok(text.includes("ほかの人と比べた結果ではありません"));
  assert.ok(node.querySelectorAll("tbody")[0].children.length === 8);
});

test("判定不能でも結果画面が壊れず、カードへ進める", () => {
  const snapshot = snapshotFor(uniformAnswers(3));
  assert.equal(snapshot.standardizable, false);
  const node = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} });
  assert.ok(node.textContent.includes("称号を決められませんでした"));
  assert.ok(node.textContent.includes("カードを見る"));
});

test("出典・免責画面に出典とデータ削除がある", () => {
  const node = renderAboutScreen({ onBack() {}, onClearAll() {} });
  const text = node.textContent;
  assert.ok(text.includes("ORVIS"));
  assert.ok(text.includes("パブリックドメイン"));
  assert.ok(text.includes("削除"));
});
