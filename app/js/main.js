import { appMeta } from "./config/app-meta.js";
import { ItemMaster } from "./data/item-master.js";
import {
  createResponseState, withAnswer, withIndex, isComplete,
  firstUnansweredIndex, TOTAL_ITEM_COUNT,
} from "./domain/response-state.js";
import { scoreScales } from "./domain/scoring.js";
import { standardize } from "./domain/standardize.js";
import { classify } from "./domain/type-classifier.js";
import { createResultSnapshot, attachBigFive, isValidSnapshot } from "./domain/result-snapshot.js";
import { createStore } from "./infrastructure/progress-storage.js";
import { receiveBigFive } from "./infrastructure/linkage-intake.js";
import { resolveRoute, hashFor } from "./infrastructure/router.js";
import { renderStartScreen } from "./presentation/start-screen.js";
import { renderQuestionnaireScreen } from "./presentation/questionnaire-screen.js";
import { renderResultScreen } from "./presentation/result-screen.js";
import { renderCardScreen } from "./presentation/card-screen.js";
import { renderAboutScreen } from "./presentation/about-screen.js";
import { clear, el } from "./presentation/screen-helpers.js";

const store = createStore();
// ココロパレアから #b5= で来たときは、画面を組み立てる前に受け取ってURLから消す（F-010）。
// 受け取れなくても何も表示しない。単体の結果へそのまま進む。
receiveBigFive({ location: globalThis.location, history: globalThis.history, store });
let response = createResponseState(store.load().progress);
let snapshot = null;
const initial = store.latestResult();
if (isValidSnapshot(initial)) snapshot = initial;

function go(route) {
  const next = hashFor(route);
  if (location.hash === next) render();
  else location.hash = next;
}

function persist() {
  store.saveProgress({ answers: response.answers, currentIndex: response.currentIndex });
}

function finish() {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers: response.answers }));
  const classification = classify(standardized);
  // 先に連携してから45問に答えた人も、結果に連携が乗った状態で保存する（F-011の裏側）。
  snapshot = attachBigFive(createResultSnapshot({ standardized, classification }), store.load().bigFive);
  store.saveResult(snapshot);
  response = createResponseState(null);
  go("result");
}

function answer(itemId, value) {
  response = withAnswer(response, itemId, value);
  persist();
  if (isComplete(response)) { finish(); return; }
  const next = response.currentIndex + 1;
  response = withIndex(response, Math.min(next, TOTAL_ITEM_COUNT - 1));
  persist();
  render();
}

// 出典・免責を開く前にいた画面。**結果の有無ではなく、来た道で戻す。**
// 結果があるからという理由で結果画面へ送ると、トップから開いた人が別の場所へ飛ぶ。
let aboutReturnRoute = "start";

function openAbout(from) {
  aboutReturnRoute = from;
  go("about");
}

function screenFor(route) {
  if (route === "answer") {
    return renderQuestionnaireScreen({
      state: response,
      onAnswer: answer,
      onBack: () => {
        if (response.currentIndex === 0) return;
        response = withIndex(response, response.currentIndex - 1);
        persist();
        render();
      },
      onQuit: () => go("start"),
    });
  }
  if (route === "result") {
    if (!snapshot) return screenFor("start");
    return renderResultScreen({
      snapshot,
      // **結果に紐づいた連携**を見る。カード（F-022）と同じ出どころに揃える。
      // いまの連携（store）を見ると、連携を外したときに画面とカードで食い違う。
      bigFive: snapshot.bigFive,
      onCard: () => go("card"),
      onRestart: () => { response = createResponseState(null); store.clearProgress(); go("answer"); },
      onHome: () => go("start"),
      onAbout: () => openAbout("result"),
    });
  }
  if (route === "card") {
    if (!snapshot) return screenFor("start");
    return renderCardScreen({ snapshot, onBack: () => go("result"), onHome: () => go("start") });
  }
  if (route === "about") {
    return renderAboutScreen({
      onBack: () => go(aboutReturnRoute === "result" && snapshot ? "result" : "start"),
      onClearAll: () => {
        if (!globalThis.confirm("この端末に保存した回答と結果をすべて削除します。よろしいですか。")) return;
        store.clearAll();
        response = createResponseState(null);
        snapshot = null;
        go("start");
      },
    });
  }
  return renderStartScreen({
    progressState: response,
    latestResult: snapshot,
    storageStatus: store.status,
    onStart: () => { response = createResponseState(null); store.clearProgress(); go("answer"); },
    onResume: () => { response = withIndex(response, firstUnansweredIndex(response)); go("answer"); },
    onShowResult: () => go("result"),
    onAbout: () => openAbout("start"),
  });
}

function render() {
  const root = document.getElementById("app");
  if (!root) return;
  clear(root);
  root.appendChild(screenFor(resolveRoute(location.hash)));
  const footer = document.getElementById("app-version");
  if (footer) footer.textContent = appMeta.appVersion;
}

// ページを読み込み直さずにハッシュだけが変わって来る経路もある（タブが開いたまま
// 連携リンクを開いた場合など）。起動時と同じ受け取りをここでも通す。#b5= でなければ何もしない。
globalThis.addEventListener?.("hashchange", () => {
  const link = receiveBigFive({ location: globalThis.location, history: globalThis.history, store });
  // 受け取れたら、結び付け直された結果をメモリへ読み直す（F-011）。
  // **これが無いと、開いたままのタブでは連携が結果画面にもカードにも出ない。**
  // 起動時の経路は受け取りのあとに読み込むので問題にならないが、ここは別経路である。
  if (link) {
    const latest = store.latestResult();
    if (isValidSnapshot(latest)) snapshot = latest;
  }
  render();
});
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
}

export { render, el };
