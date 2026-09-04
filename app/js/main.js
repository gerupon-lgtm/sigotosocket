import { appMeta } from "./config/app-meta.js";
import { ItemMaster } from "./data/item-master.js";
import {
  createResponseState, withAnswer, withIndex, isComplete,
  firstUnansweredIndex, TOTAL_ITEM_COUNT,
} from "./domain/response-state.js";
import { scoreScales } from "./domain/scoring.js";
import { standardize } from "./domain/standardize.js";
import { classify } from "./domain/type-classifier.js";
import { createResultSnapshot, isValidSnapshot } from "./domain/result-snapshot.js";
import { createStore } from "./infrastructure/progress-storage.js";
import { resolveRoute, hashFor } from "./infrastructure/router.js";
import { renderStartScreen } from "./presentation/start-screen.js";
import { renderQuestionnaireScreen } from "./presentation/questionnaire-screen.js";
import { renderResultScreen } from "./presentation/result-screen.js";
import { renderCardScreen } from "./presentation/card-screen.js";
import { renderAboutScreen } from "./presentation/about-screen.js";
import { clear, el } from "./presentation/screen-helpers.js";

const store = createStore();
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
  snapshot = createResultSnapshot({ standardized, classification });
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
      onCard: () => go("card"),
      onRestart: () => { response = createResponseState(null); store.clearProgress(); go("answer"); },
      onAbout: () => go("about"),
    });
  }
  if (route === "card") {
    if (!snapshot) return screenFor("start");
    return renderCardScreen({ snapshot, onBack: () => go("result") });
  }
  if (route === "about") {
    return renderAboutScreen({
      onBack: () => go(snapshot ? "result" : "start"),
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
    onAbout: () => go("about"),
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

globalThis.addEventListener?.("hashchange", render);
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
}

export { render, el };
