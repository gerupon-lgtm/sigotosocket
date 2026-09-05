import { el } from "./screen-helpers.js";

/**
 * 全画面共通のヘッダー。**組み立てはココロパレアの `app-header.js` に合わせている**
 * （ブランドを2つに割る／画面名／右に操作1つ／設問画面だけ sticky）。
 *
 * **配色は合わせない。**要件定義書 v1.8 で、ココロパレアと並べて見分けがつかないため
 * 緑系から紺系へ移した。構造と導線だけを揃え、色は分けたままにする。
 */
const BRAND_PARTS = Object.freeze(["シゴトソケット｜", "ORVIS 自己理解支援ツール"]);

export function appHeader({ screenLabel = "", action = null, sticky = false } = {}) {
  return el("header", { class: sticky ? "app-header is-sticky" : "app-header" }, [
    el("div", { class: "app-brand" },
      BRAND_PARTS.map((part) => el("span", { class: "app-brand-part", text: part }))),
    screenLabel ? el("span", { class: "app-screen-label", text: screenLabel }) : null,
    action
      ? el("button", { class: "app-header-action", type: "button", onClick: action.onClick },
        action.label)
      : null,
  ]);
}
