/**
 * ②整合／不整合の文言（F-012・processing-design §8-3）。
 *
 * **並置型。**「特性からはこう予想されるが実際は違った」とは書かない。
 * 本人の2つの事実と、原典で報告された結びつきの強さを別々に書き、
 * 両者を結ぶ推論は読み手に返す。§10-2 の検証ゲートの置き換えがこれである。
 *
 * **LLMを使わない**（変更禁止事項10）。ここの定型文がそのまま画面に出る。
 */

/**
 * 節の前書き。**全員同じ。1回だけ出す。**
 * 後半2文が §10-2 の置き換えなので、**削らない**。
 */
export const CONSISTENCY_PREAMBLE = Object.freeze([
  "ココロパレアの5因子と、45問の8領域を並べています。"
  + "ORVISの原典では、下に挙げた組み合わせに結びつきが報告されています。",
  "ただしその数値は英語の原版のもので、日本語にした45問で同じ強さが出るかは、まだ確かめていません。"
  + "読み方が当てはまるかどうかは、あなたが決めてください。",
]);

/** 6ペアすべてが落ちたとき。**これも正式な結果**（変更禁止事項4）。 */
export const CONSISTENCY_NONE = Object.freeze([
  "6つの組み合わせのどれについても、あなたの中ではっきりした向きが出ませんでした。これも結果のひとつです。",
]);

/**
 * 対象の6ペア。**増やさない**（変更禁止事項3）。順序は processing-design §8 の表のまま。
 * 強さが同じときの並び順にも使うので、**並べ替えない。**
 *
 * `r` は原典で報告された相関。**係数として掛けない。**ペアを選ぶ根拠と、
 * `note`（本文に添える但し書き）にのみ使う。
 *
 * `text` は読み方の定型文。**1ペアにつき3本。**「揃った」は両方高いのと
 * 両方低いのを分ける（同じ文では意味が通らない）。「分かれた」は左右対称なので1本でよい。
 */
export const CONSISTENCY_PAIRS = Object.freeze([
  Object.freeze({
    factorId: "intellectImagination", scaleId: "creativity", r: 0.30,
    note: "原典で報告された結びつきは r=.30 で、強いものではありません。",
    text: Object.freeze({
      alignedHigh: "新しいものを考えることへの関心が、仕事に求めるものにもつながっている、と読めます。",
      alignedLow: "考えを広げることも、仕事の中身に新しさを求めることも、いまのあなたの中では前に出ていないようです。",
      crossed: "考えることが好きなのと、それを仕事の中身にしたいのとは、別のことかもしれません。",
    }),
  }),
  Object.freeze({
    factorId: "intellectImagination", scaleId: "erudition", r: 0.34,
    note: "原典で報告された結びつきは r=.34 で、強いものではありません。",
    text: Object.freeze({
      alignedHigh: "知りたい気持ちが、読み書きや調べものへの関心にもそのまま出ている、と読めます。",
      alignedLow: "知識を広げることも、言葉を扱う活動も、いまのあなたの関心の中心ではないようです。",
      crossed: "考えることと、それを言葉で扱うこととは、別々に決まるのかもしれません。",
    }),
  }),
  Object.freeze({
    factorId: "intellectImagination", scaleId: "leadership", r: 0.29,
    note: "原典で報告された結びつきは r=.29 で、強いものではありません。",
    text: Object.freeze({
      alignedHigh: "考えを持つことと、それを人に示して動かすことが、同じ向きに出ている、と読めます。",
      alignedLow: "考えを広げることも、人をまとめることも、いまのあなたの中では前に出ていないようです。",
      crossed: "自分で考えることと、人を率いる立場に立つこととは、別のことかもしれません。",
    }),
  }),
  Object.freeze({
    factorId: "agreeableness", scaleId: "altruism", r: 0.42,
    note: "原典ではこの2つがもっとも強く結びついていましたが、その強さは r=.42 で、"
      + "「だいたい一致する」というほどではありません。",
    text: Object.freeze({
      alignedHigh: "人に向く気持ちが、仕事に求めるものにもそのまま出ている、と読めます。",
      alignedLow: "人に合わせることも、人を支えることを仕事の中心に置くことも、いまのあなたの中では前に出ていないようです。",
      crossed: "人に合わせることと、人を支えること自体を仕事の中身に選ぶことは、別々に決まるのかもしれません。",
    }),
  }),
  Object.freeze({
    factorId: "extraversion", scaleId: "leadership", r: 0.38,
    note: "原典で報告された結びつきは r=.38 で、強いものではありません。",
    text: Object.freeze({
      alignedHigh: "人と関わることへの向きが、まとめ役を引き受けたい気持ちにもつながっている、と読めます。",
      alignedLow: "人と関わることも、引っぱる立場に立つことも、いまのあなたの中では前に出ていないようです。",
      crossed: "人と関わるのが好きなことと、引っぱる立場に立ちたいかは、別のことかもしれません。",
    }),
  }),
  Object.freeze({
    factorId: "conscientiousness", scaleId: "organization", r: 0.20,
    note: "原典で報告された結びつきは r=.20 で、6つの中でもっとも弱いものです。",
    text: Object.freeze({
      alignedHigh: "きちんと進めたい気持ちが、仕事の選び方にも表れている、と読めます。",
      alignedLow: "きちんと進めることも、段取りを組む活動も、いまのあなたの中では前に出ていないようです。",
      crossed: "きちんとやることと、段取りそのものを仕事にしたいかは、別々に決まるのかもしれません。",
    }),
  }),
]);

/**
 * 本人の中での位置づけ。**個人内比較しか書かない**（変更禁止事項2）。
 * @param {number} position 1始まりの順位
 * @param {number} total 母数（5因子なら5、8領域なら8）
 */
export function positionPhrase(position, total) {
  if (position === 1) return "いちばん高く出ています";
  if (position === total) return "いちばん低く出ています";
  return position * 2 <= total ? "高いほうです" : "低いほうです";
}

/**
 * 向きが揃ったときの2文目。**1文目と同じ語を繰り返さない。**
 * 「いちばん高く出ています」が2回続くと単調に読める（2026-09-05 本人指摘）。
 * 言い換えるだけで、意味は `positionPhrase` と同じ。
 */
const ECHO_PHRASE = Object.freeze({
  "いちばん高く出ています": "同じくいちばん上に来ています",
  "いちばん低く出ています": "同じくいちばん下に来ています",
  "高いほうです": "同じく高いほうです",
  "低いほうです": "同じく低いほうです",
});

export function echoPhrase(phrase) {
  return ECHO_PHRASE[phrase] ?? phrase;
}
