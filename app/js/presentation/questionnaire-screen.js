import { el } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { TOTAL_ITEM_COUNT, itemAt } from "../domain/response-state.js";

const CHOICES = Object.freeze([
  { value: 1, label: "絶対にいや" },
  { value: 2, label: "いや" },
  { value: 3, label: "どちらでもない" },
  { value: 4, label: "好き" },
  { value: 5, label: "とても好き" },
]);

/** 最終回答を保存したあと、採点・結果保存の前に明示的な確認を挟む。 */
function questionnaireManagement(onDiscard) {
  return el("details", { class: "questionnaire-management" }, [
    el("summary", { text: "その他の操作" }),
    el("button", {
      class: "danger-button",
      type: "button",
      onClick: onDiscard,
    }, "回答を破棄"),
  ]);
}

export function renderCompletionScreen({ onComplete, onBack, onQuit, onDiscard }) {
  return el("section", { class: "screen question completion" }, [
    appHeader({ action: { label: "中断してトップへ", onClick: onQuit } }),
    el("p", { class: "counter", text: `${TOTAL_ITEM_COUNT} / ${TOTAL_ITEM_COUNT}問` }),
    el("h1", { text: `${TOTAL_ITEM_COUNT}問の回答が完了しました` }),
    el("p", {
      class: "lead",
      text: "回答を見直す場合は戻ることができます。内容を確定すると結果を表示します。",
    }),
    el("div", { class: "actions completion-actions" }, [
      el("button", { class: "primary", type: "button", onClick: onComplete }, "結果を見る"),
      el("button", { class: "secondary", type: "button", onClick: onBack }, "回答へ戻る"),
    ]),
    questionnaireManagement(onDiscard),
  ]);
}

/** 1問1画面。ココロパレア踏襲。出題順は固定でシャッフルしない。 */
export function renderQuestionnaireScreen({
  state,
  onAnswer,
  onBack,
  onQuit,
  onDiscard,
  onComplete,
  completionAvailable = false,
}) {
  const item = itemAt(state.currentIndex);
  const current = state.answers[item.id];
  const progress = ((state.currentIndex + 1) / TOTAL_ITEM_COUNT) * 100;

  const choices = CHOICES.map((choice) => el("button", {
    class: `choice answer-option${current === choice.value ? " selected" : ""}`,
    type: "button",
    "aria-pressed": current === choice.value,
    onClick: () => onAnswer(item.id, choice.value),
  }, choice.label));

  return el("section", { class: "screen question questionnaire-screen" }, [
    // 設問画面だけ sticky。長い一覧を送っても中断の導線が視界から消えない（ココロパレア踏襲）。
    appHeader({ sticky: true, action: { label: "中断してトップへ", onClick: onQuit } }),
    el("div", { class: "progress", role: "progressbar", "aria-valuemin": "1",
      "aria-valuemax": String(TOTAL_ITEM_COUNT), "aria-valuenow": String(state.currentIndex + 1) }, [
      // 幅は style プロパティで入る（`el` が CSSOM を使う）。style属性はCSPで無視される
      el("div", { class: "progress-bar", style: { width: `${progress}%` } }),
    ]),
    el("p", { class: "counter", text: `${state.currentIndex + 1} / ${TOTAL_ITEM_COUNT}問` }),
    el("p", { class: "prompt", text: "こういうことをするのは、好きですか。" }),
    el("h2", { class: "item-text", text: item.textJa }),
    el("div", { class: "choices answer-options" }, choices),
    el("div", { class: "actions row questionnaire-navigation" }, [
      el("button", {
        class: "secondary secondary-button", type: "button",
        disabled: state.currentIndex === 0,
        onClick: onBack,
      }, "前の質問"),
      completionAvailable
        ? el("button", {
          class: "primary complete-review primary-button questionnaire-complete-button",
          type: "button",
          onClick: onComplete,
        }, "回答を完了する")
        : null,
    ]),
    questionnaireManagement(onDiscard),
  ]);
}
