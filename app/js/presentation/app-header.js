import { el } from "./screen-helpers.js";
import { appMeta } from "../config/app-meta.js";

/**
 * 全画面共通のヘッダー。**組み立てはココロパレアの `app-header.js` に合わせている**
 * ——アイコン＋（名称／副題の2行）、右端に操作を1つ、設問画面だけ sticky。
 * **画面名はここに置かない。**本文側の `screen-heading.js` が持つ。
 *
 * **配色は合わせない。**要件定義書 v1.8 で、ココロパレアと並べて見分けがつかないため
 * 緑系から紺系へ移した。構造と導線だけを揃え、色は分けたままにする。
 */
export function appHeader({ action = null, sticky = false } = {}) {
  const mark = el("img", {
    class: "app-mark",
    src: appMeta.brand.iconPath,
    alt: "",           // 装飾。名称は隣のテキストが読み上げる
    width: "38", height: "38",
  });

  return el("header", { class: sticky ? "app-header is-sticky" : "app-header" }, [
    el("div", { class: "app-brand" }, [
      mark,
      el("span", { class: "app-brand-copy" }, [
        el("span", { class: "app-brand-name", text: appMeta.brand.name }),
        el("span", { class: "app-brand-subtitle", text: appMeta.brand.subtitle }),
      ]),
    ]),
    action
      ? (action.href
        ? el("a", { class: "app-header-action", href: action.href }, action.label)
        : el("button", { class: "app-header-action", type: "button", onClick: action.onClick }, action.label))
      : null,
  ]);
}
