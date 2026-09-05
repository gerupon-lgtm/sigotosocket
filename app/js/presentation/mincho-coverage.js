import { TypeDefinitions, UNDETERMINED_TEXT } from "../data/type-definitions.js";
import { TEXT } from "./card-layout.js";

/**
 * カードで明朝（`card-renderer.js` の MINCHO）で描く文字列。
 *
 * 同梱するサブセットフォントに何の字が要るかは、ここだけを見て決まる。
 * **`card-renderer.js` で MINCHO を使う箇所を増やしたら、ここにも足すこと。**
 * 足し忘れは `mincho-font.test.js` の呼び出し箇所テストが検出する。
 */
export function minchoTexts() {
  return [
    TEXT.titlePill,   // 「あなたの称号」   ヘッダーのピル
    TEXT.footerPill,  // 「45問 詳細結果」 下部のピル
    UNDETERMINED_TEXT.name,
    ...TypeDefinitions.map((type) => type.name),
  ];
}

/** 明朝で要る文字を、重複なく符号位置の昇順で返す。 */
export function minchoChars() {
  return [...new Set(minchoTexts().join(""))].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
}
