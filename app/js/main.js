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
import {
  renderQuestionnaireScreen,
  renderCompletionScreen,
} from "./presentation/questionnaire-screen.js";
import { renderResultScreen } from "./presentation/result-screen.js";
import { renderCardScreen } from "./presentation/card-screen.js";
import { renderAboutScreen } from "./presentation/about-screen.js";
import { clear, el } from "./presentation/screen-helpers.js";

const store = createStore();
let snapshot = null;

function receiveLinkage() {
  const bigFiveBeforeIntake = store.load().bigFive;
  const link = receiveBigFive({
    location: globalThis.location,
    history: globalThis.history,
    store,
  });
  if (!link) return null;
  const latest = store.latestResult();
  if (isValidSnapshot(latest)) snapshot = latest;
  return {
    kind: bigFiveBeforeIntake ? "updated" : "received",
    hasResult: snapshot !== null,
  };
}

// ココロパレアから #b5= で来たときは、画面を組み立てる前に受け取ってURLから消す（F-010）。
// 受け取れなくても何も表示しない。単体の結果へそのまま進む。
let linkageReceipt = receiveLinkage();
let response = createResponseState(store.load().progress);
let completionQuestionVisible = false;
const initial = store.latestResult();
if (isValidSnapshot(initial)) snapshot = initial;

function go(route) {
  if (route !== "start") linkageReceipt = null;
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
  completionQuestionVisible = false;
  go("result");
}

function discardCurrentResponse() {
  if (!globalThis.confirm("途中回答を破棄します。破棄後は復元できません。")) return;
  response = createResponseState(null);
  completionQuestionVisible = false;
  store.clearProgress();
  go("start");
}

function answer(itemId, value) {
  response = withAnswer(response, itemId, value);
  persist();
  if (
    isComplete(response)
    && response.currentIndex === TOTAL_ITEM_COUNT - 1
    && !completionQuestionVisible
  ) {
    completionQuestionVisible = false;
    render();
    return;
  }
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
    if (isComplete(response) && !completionQuestionVisible) {
      return renderCompletionScreen({
        onComplete: finish,
        onBack: () => {
          completionQuestionVisible = true;
          render();
        },
        onQuit: () => go("start"),
        onDiscard: discardCurrentResponse,
      });
    }
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
      onDiscard: discardCurrentResponse,
      onComplete: finish,
      completionAvailable: completionQuestionVisible,
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
    linkageReceipt,
    onStart: () => {
      completionQuestionVisible = false;
      response = createResponseState(null);
      store.clearProgress();
      go("answer");
    },
    onResume: () => {
      completionQuestionVisible = false;
      response = withIndex(response, firstUnansweredIndex(response));
      go("answer");
    },
    onShowResult: () => go("result"),
    onAbout: () => openAbout("start"),
  });
}

function render() {
  const root = document.getElementById("app");
  if (!root) return;
  clear(root);
  root.appendChild(screenFor(resolveRoute(location.hash)));
  // ハッシュルーティングはページを再読込しないため、前画面のスクロール位置が残る。
  // 画面を組み立て終えた時点で毎回先頭へ戻し、通常のページ遷移と同じ見え方にする。
  globalThis.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  const footer = document.getElementById("app-version");
  if (footer) footer.textContent = appMeta.appVersion;
}

// ページを読み込み直さずにハッシュだけが変わって来る経路もある（タブが開いたまま
// 連携リンクを開いた場合など）。起動時と同じ受け取りをここでも通す。#b5= でなければ何もしない。
globalThis.addEventListener?.("hashchange", () => {
  // 受け取れたら、結び付け直された結果をメモリへ読み直す（F-011）。
  // **これが無いと、開いたままのタブでは連携が結果画面にもカードにも出ない。**
  const receipt = receiveLinkage();
  if (receipt) linkageReceipt = receipt;
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
