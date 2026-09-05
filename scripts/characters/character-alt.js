/**
 * アセットのaltテキスト。**手書き。**`npm run character:manifest` がこれを読んで
 * ハッシュと一緒に `app/js/data/character-manifest.js` へ書き出す。
 *
 * 書き方の約束（変更禁止事項6・7）:
 * - **職業を書かない。**所作（何をしている姿か）と道具だけで書く
 * - 針を性格の記号にしない。造形として以上のことを言わない
 * - 体格・大きさに優劣の含みを持たせない
 * - 丸まった防御姿勢は使っていない。altでも「閉じる」「守る」と書かない
 */

export const PoseAlt = Object.freeze({
  leadership: "前足を横へ伸ばして、向こうを示しているハリネズミ",
  organization: "前足をそろえて座っているハリネズミ",
  altruism: "両方の前足を前へ差し出しているハリネズミ",
  creativity: "片方の前足を高く上げているハリネズミ",
  analysis: "身を低くして鼻先を近づけ、のぞきこんでいるハリネズミ",
  production: "前足を前へ伸ばして、腹ばいになっているハリネズミ",
  adventure: "前へ踏み出して歩いているハリネズミ",
  erudition: "口を開いて話しているハリネズミ",
  neutral: "正面を向いて座っているハリネズミ",
  // 第2フェーズ用。MVPのカードには出さない。
  guest: "正面を向いて座り、少し笑っているハリネズミ",
});

/**
 * ゲスト出演の猫（F-022）。ココロパレアの完成画像から**猫だけを切り出した**もので、
 * 描き直し・拡大縮小・再配色はしていない（小物の連結成分を消して余白を詰めただけ）。
 * altでも猫を主役として書かず、「ゲスト」であることが分かる書き方にする。
 */
export const GuestAlt = Object.freeze({
  cat: "ココロパレアからゲスト出演した、正面を向いて座っている猫",
});

export const PropAlt = Object.freeze({
  leadership: "台に立てた三角の旗",
  organization: "番号を書いた札と砂時計",
  altruism: "湯気の立つカップ",
  creativity: "絵の具の皿と筆",
  analysis: "虫めがね",
  production: "木槌と木片",
  adventure: "巻いたロープ",
  erudition: "積んだ本と開いた本",
});
