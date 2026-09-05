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
const { uniformAnswers, answersWith, answersByScale } = await import("./helpers.js");

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

test("結果画面はホランド型を出す（F-024）", () => {
  const snapshot = snapshotFor(answersByScale({ leadership: 5, analysis: 4 }));
  assert.equal(snapshot.rank[0], "leadership");
  const node = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} });
  const text = node.textContent;
  assert.ok(text.includes("企業的（Enterprising）"), "1位の型名が出ていない");
  assert.ok(text.includes("調べてみてください"), "調べる手がかりの案内が出ていない");
});

test("言葉が1位なら、結果画面は6類型の外だと伝え、2位の型を参考に添える", () => {
  const snapshot = snapshotFor(answersByScale({ erudition: 5, analysis: 4 }));
  assert.equal(snapshot.rank[0], "erudition");
  assert.equal(snapshot.rank[1], "analysis");
  const text = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} }).textContent;
  assert.ok(text.includes("6類型の外にある"), "型を持たない領域である旨が出ていない");
  assert.ok(text.includes("（参考）次に高かった「探究」は「研究的（Investigative）」"));
  assert.ok(!text.includes("対応なし"), "「対応なし」とは書かない");
});

test("判定不能ならホランド型の節を出さない", () => {
  const snapshot = snapshotFor(uniformAnswers(3));
  assert.equal(snapshot.rank, null);
  const text = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} }).textContent;
  assert.ok(!text.includes("ホランド"), "順位が無いのにホランド型が出ている");
});

test("連携済みで手仕事・挑戦が上位なら、結果画面に固有の興味が出る（F-013）", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  assert.deepEqual(snapshot.rank.slice(0, 2), ["production", "adventure"]);
  const node = renderResultScreen({
    snapshot, bigFive: parseBigFiveCode("v1-342288401195267"),
    onCard() {}, onRestart() {}, onAbout() {},
  });
  const text = node.textContent;
  assert.ok(text.includes("手仕事") && text.includes("挑戦"));
  assert.ok(text.includes("予測できるものではありません"), "③の根拠が出ていない");
});

test("連携していなければ固有の興味は出さない", () => {
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: null, onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(!text.includes("予測できるものではありません"),
    "連携していないのに固有の興味を出している");
});

test("連携済みでも対象の領域が上位でなければ出さない", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const snapshot = snapshotFor(answersByScale({ analysis: 5, erudition: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: parseBigFiveCode("v1-342288401195267"),
    onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(!text.includes("予測できるものではありません"));
});

test("未連携で対象が上位なら、連携の予告を出す（F-014）", () => {
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: null, onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(text.includes("連携すると"), "予告が出ていない");
  assert.ok(text.includes("手仕事"), "本人の領域名が入っていない");
});

test("連携済みなら予告は消え、本文に入れ替わる", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: parseBigFiveCode("v1-342288401195267"),
    onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(!text.includes("連携すると"), "連携済みなのに予告が残っている");
  assert.ok(text.includes("予測できるものではありません"), "本文が出ていない");
});

test("全画面にヘッダーがあり、画面名が入る（ココロパレアに合わせた導線）", () => {
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const screens = [
    ["はじめる", renderStartScreen({
      progressState: createResponseState(null), latestResult: null,
      storageStatus: STORAGE_STATUS.OK,
      onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
    })],
    ["回答中", renderQuestionnaireScreen({
      state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit() {},
    })],
    ["詳細結果", renderResultScreen({
      snapshot, bigFive: null, onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
    })],
    ["出典・免責", renderAboutScreen({ onBack() {}, onClearAll() {} })],
  ];
  for (const [label, node] of screens) {
    const header = node.querySelectorAll(".app-header")[0];
    assert.ok(header, `${label}: ヘッダーが無い`);
    assert.equal(header.querySelectorAll(".app-brand-part").length, 2, `${label}: ブランドが無い`);
    assert.equal(header.querySelectorAll(".app-screen-label")[0]?.textContent, label,
      `${label}: 画面名が違う`);
  }
});

test("設問画面のヘッダーは sticky で、中断してトップへを持つ", () => {
  let quit = 0;
  const node = renderQuestionnaireScreen({
    state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit: () => { quit += 1; },
  });
  const header = node.querySelectorAll(".app-header")[0];
  assert.ok(header.className.includes("is-sticky"), "設問画面のヘッダーが sticky でない");
  const action = header.querySelectorAll(".app-header-action")[0];
  assert.equal(action.textContent, "中断してトップへ");
  action.click();
  assert.equal(quit, 1);
});

test("結果画面にトップへ戻るがある（ココロパレアと同じ導線）", () => {
  let home = 0;
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const node = renderResultScreen({
    snapshot, bigFive: null,
    onCard() {}, onRestart() {}, onHome: () => { home += 1; }, onAbout() {},
  });
  const back = [...node.querySelectorAll("button")].find((b) => b.textContent === "トップへ戻る");
  assert.ok(back, "トップへ戻るが無い");
  back.click();
  assert.equal(home, 1);
});

test("出典・免責画面に同梱フォントの出典がある（SIL OFL 1.1）", () => {
  const text = renderAboutScreen({ onBack() {}, onClearAll() {} }).textContent;
  assert.ok(text.includes("Noto Serif JP"), "元フォント名が無い");
  assert.ok(text.includes("SIL Open Font License"), "許諾の名前が無い");
});

test("出典・免責画面に出典とデータ削除がある", () => {
  const node = renderAboutScreen({ onBack() {}, onClearAll() {} });
  const text = node.textContent;
  assert.ok(text.includes("ORVIS"));
  assert.ok(text.includes("パブリックドメイン"));
  assert.ok(text.includes("削除"));
});
