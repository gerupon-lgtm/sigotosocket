import { SCALE_ORDER } from "./scale-order.js";
import { buildTypeId } from "../domain/type-classifier.js";

/**
 * 上位2尺度の組み合わせ28通り（8尺度から2つ、順序なし）。
 * name は識別可能な名詞句、lead は1文の導入。
 * 尺度そのものの説明は scale-definitions.js が持ち、結果文は result-composer.js が組み立てる。
 *
 * 【想定】名称と導入文は初版のドラフト。本人レビューで差し替える前提（tasks.md T-019）。
 * 能力・優劣・職業の貴賤に読まれる表現を使わない。
 */
const TABLE = {
  "leadership--organization": ["段取りを束ねる進行役", "人を動かすことと、手順を整えることが同時に働きます。"],
  "leadership--altruism": ["輪を前へ運ぶ推進役", "人に向かう関心が、引っぱる力と支える力の両方に出ます。"],
  "leadership--creativity": ["構想を掲げる旗振り役", "思いついたことを、人を巻き込む形で外へ出そうとします。"],
  "leadership--analysis": ["根拠から決める舵取り役", "調べて確かめたうえで方向を示す進み方に惹かれます。"],
  "leadership--production": ["現場に立つ牽引役", "手を動かす場から離れずに、全体を動かそうとします。"],
  "leadership--adventure": ["先陣を切る開拓役", "未知の場面へ最初に踏み出すことに惹かれます。"],
  "leadership--erudition": ["言葉で導く弁士", "言葉を尽くして人を動かすことに関心が向きます。"],
  "organization--altruism": ["場を整えて迎える世話役", "人が動きやすいように、先に段取りを済ませておきます。"],
  "organization--creativity": ["型と遊びを行き来する設計役", "整える楽しさと、崩して作る楽しさの両方があります。"],
  "organization--analysis": ["数字を突き合わせる検証役", "記録と根拠を照らし合わせる作業に落ち着きます。"],
  "organization--production": ["段取りよく仕上げる実務役", "手順を決めてから手を動かす進め方に惹かれます。"],
  "organization--adventure": ["備えて飛び込む段取り役", "思い切って動く前に、準備を固めておきたいほうです。"],
  "organization--erudition": ["記録を積み上げる編纂役", "情報を集めて整理し、残す形にすることに惹かれます。"],
  "altruism--creativity": ["気持ちを形にする表現役", "人に向ける関心が、つくる行為として外へ出ます。"],
  "altruism--analysis": ["人を理解しようとする観察役", "相手を支えることと、仕組みを理解することが結びつきます。"],
  "altruism--production": ["手を貸して支える働き手", "支える気持ちが、具体的な作業として形になります。"],
  "altruism--adventure": ["助けに向かう行動役", "人のために体を動かす場面に惹かれます。"],
  "altruism--erudition": ["言葉で寄り添う伝え手", "言葉を選んで人に届けることに関心が向きます。"],
  "creativity--analysis": ["仮説を描く探究役", "思いつきと、確かめる手つきが同時に働きます。"],
  "creativity--production": ["手で作りあげる造形役", "頭の中にあるものを、実際の手仕事として形にします。"],
  "creativity--adventure": ["衝動のままに試す実験役", "思いついたらまず動いてみるほうです。"],
  "creativity--erudition": ["物語を編む書き手", "言葉と発想を組み合わせて、まとまりのある形にします。"],
  "analysis--production": ["仕組みを解いて直す技術役", "理屈を確かめることと、手で扱うことが一続きになります。"],
  "analysis--adventure": ["未知を確かめに行く踏査役", "調べたいことのために現場へ出ていきます。"],
  "analysis--erudition": ["資料を読み解く探索役", "読み、調べ、突き合わせる時間に落ち着きます。"],
  "production--adventure": ["体を使って向き合う実践役", "屋外や身体を使う場面に強く惹かれます。"],
  "production--erudition": ["知識を手仕事に落とす作り手", "調べたことを、実際に扱える形へ持っていきます。"],
  "adventure--erudition": ["見聞を広げる旅の記録役", "外へ出ていくことと、書き留めることが両方あります。"],
};

function buildAll() {
  const entries = [];
  for (let i = 0; i < SCALE_ORDER.length; i += 1) {
    for (let j = i + 1; j < SCALE_ORDER.length; j += 1) {
      const typeId = buildTypeId(SCALE_ORDER[i], SCALE_ORDER[j]);
      const key = `${SCALE_ORDER[i]}--${SCALE_ORDER[j]}`;
      const row = TABLE[key];
      if (!row) throw new TypeError(`TYPE_DEFINITION_MISSING: ${key}`);
      entries.push(Object.freeze({
        typeId,
        scaleIds: Object.freeze([SCALE_ORDER[i], SCALE_ORDER[j]]),
        name: row[0],
        lead: row[1],
      }));
    }
  }
  return Object.freeze(entries);
}

export const TypeDefinitions = buildAll();

export const TypeById = Object.freeze(
  Object.fromEntries(TypeDefinitions.map((type) => [type.typeId, type])),
);

export const UNDETERMINED_TEXT = Object.freeze({
  name: "傾向を判定できませんでした",
  lead: "8つの領域すべてに同じくらいの点を付けたため、あなたの中での高い・低いを取り出せませんでした。",
  detail: "もう一度回答するときは、少しでも心が動くほうへ寄せてみてください。下のレーダーには、回答した内容がそのまま出ています。",
});
