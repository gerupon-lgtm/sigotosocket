import { el } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { TOTAL_ITEM_COUNT, answeredCount } from "../domain/response-state.js";
import { STORAGE_STATUS } from "../infrastructure/progress-storage.js";

export function renderStartScreen({ progressState, latestResult, storageStatus, onStart, onResume, onShowResult, onAbout }) {
  const hasProgress = progressState && answeredCount(progressState) > 0;
  const actions = [
    el("button", { class: "primary", type: "button", onClick: onStart },
      hasProgress ? "はじめから回答する" : "はじめる"),
  ];
  if (hasProgress) {
    actions.unshift(el("button", { class: "primary", type: "button", onClick: onResume },
      `続きから（${answeredCount(progressState)} / ${TOTAL_ITEM_COUNT}問）`));
  }
  if (latestResult) {
    actions.push(el("button", { class: "secondary", type: "button", onClick: onShowResult },
      "前回の結果を見る"));
  }

  const notices = [];
  if (storageStatus === STORAGE_STATUS.UNAVAILABLE) {
    notices.push(el("p", { class: "notice", text: "このブラウザではデータを保存できない設定になっています。回答は画面を閉じるまでの間だけ保持されます。" }));
  }
  if (storageStatus === STORAGE_STATUS.SCHEMA_MISMATCH) {
    notices.push(el("p", { class: "notice", text: "以前の版で保存したデータが見つかりましたが、今の版では読み込めません。データは消さずに残しています。" }));
  }

  return el("section", { class: "screen start" }, [
    appHeader({ screenLabel: "はじめる" }),
    el("h1", { text: "シゴトソケット" }),
    el("p", { class: "lead", text: "8つの領域から、あなたが「やってみたい」と感じる方向を見つけます。" }),
    el("p", { class: "meta", text: `全${TOTAL_ITEM_COUNT}問・所要およそ5分` }),
    ...notices,
    el("div", { class: "actions" }, actions),
    el("p", { class: "disclaimer" }, [
      "この診断は医学的・心理学的な検査ではありません。結果は自己理解の手がかりとしてお使いください。",
      el("br"),
      el("button", { class: "link", type: "button", onClick: onAbout }, "出典・免責・データの扱い"),
    ]),
  ]);
}
