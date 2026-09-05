import { appMeta } from "../config/app-meta.js";
import { el } from "./screen-helpers.js";

/**
 * 連携は各診断を完了するための必須手順ではない。
 * 興味を持った人だけが開ける補助情報として、トップと未連携結果で共用する。
 */
export function linkageGuide() {
  return el("details", { class: "linkage-guide" }, [
    el("summary", { text: "ココロパレアとの連携方法" }),
    el("div", { class: "linkage-guide-body" }, [
      el("p", { text: "シゴトソケットとココロパレアは、それぞれ単独で利用できます。2つの結果を合わせて見たい場合だけ連携してください。" }),
      el("ol", { class: "linkage-guide-steps" }, [
        el("li", { text: "ココロパレアで50問の詳細結果を開きます。" }),
        el("li", { text: "結果画面の「シゴトソケットへ結果を渡す」を押します。" }),
        el("li", { text: "シゴトソケットに結果があればすぐに反映され、まだ無い場合は45問を終えた後に組み合わせて確認できます。" }),
      ]),
      el("p", { class: "linkage-guide-note", text: "渡されるのは5因子の数値だけです。回答そのものは渡されません。" }),
      el("p", { class: "linkage-guide-note", text: "複数の結果は同時に連携できません。新しく渡すと以前の情報が置き換わり、最後に渡した結果だけが使われます。ココロパレア内の履歴は削除されません。" }),
      el("p", { class: "linkage-guide-link" }, [
        el("a", {
          href: appMeta.brand.siblingUrl,
          rel: "noreferrer",
        }, `${appMeta.brand.siblingName}へ進む`),
      ]),
    ]),
  ]);
}
