import { el } from "./screen-helpers.js";

/**
 * 画面の見出し。**英字のキッカー＋日本語のタイトルの2段。**
 * ココロパレアの `screen-heading.js` に合わせている。画面名をヘッダーに置かず
 * 本文の先頭で示すことで、ヘッダーはブランドと操作だけの高さで済む。
 */
export function screenHeading({ kicker, title }) {
  return el("header", { class: "screen-heading" }, [
    el("p", { class: "screen-kicker", text: kicker }),
    el("h1", { class: "screen-title", text: title }),
  ]);
}
