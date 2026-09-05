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

/** 1問1画面。ココロパレア踏襲。出題順は固定でシャッフルしない。 */
export function renderQuestionnaireScreen({ state, onAnswer, onBack, onQuit }) {
  const item = itemAt(state.currentIndex);
  const current = state.answers[item.id];
  const progress = ((state.currentIndex + 1) / TOTAL_ITEM_COUNT) * 100;

  const choices = CHOICES.map((choice) => el("button", {
    class: `choice${current === choice.value ? " selected" : ""}`,
    type: "button",
    "aria-pressed": current === choice.value,
    onClick: () => onAnswer(item.id, choice.value),
  }, choice.label));

  return el("section", { class: "screen question" }, [
    // 設問画面だけ sticky。長い一覧を送っても中断の導線が視界から消えない（ココロパレア踏襲）。
    appHeader({ sticky: true, action: { label: "中断してトップへ", onClick: onQuit } }),
    el("div", { class: "progress", role: "progressbar", "aria-valuemin": "1",
      "aria-valuemax": String(TOTAL_ITEM_COUNT), "aria-valuenow": String(state.currentIndex + 1) }, [
      el("div", { class: "progress-bar", style: `width:${progress}%` }),
    ]),
    el("p", { class: "counter", text: `${state.currentIndex + 1} / ${TOTAL_ITEM_COUNT}問` }),
    el("p", { class: "prompt", text: "こういうことをするのは、好きですか。" }),
    el("h2", { class: "item-text", text: item.textJa }),
    el("div", { class: "choices" }, choices),
    el("div", { class: "actions row" }, [
      el("button", {
        class: "secondary", type: "button",
        disabled: state.currentIndex === 0,
        onClick: onBack,
      }, "戻る"),
    ]),
  ]);
}
