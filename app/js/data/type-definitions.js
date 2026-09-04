import { SCALE_ORDER } from "./scale-order.js";
import { buildTypeId } from "../domain/type-classifier.js";

/**
 * 上位2領域の組み合わせ28通り（8領域から2つ、順序なし）。
 * ココロパレアの結果文の作りを踏襲し、1件につき次の3つを持つ。
 *   name     … 称号。エンタメ表現であり、心理学上の正式なタイプ名ではない
 *   subtitle … 中立副題。称号を能力や優劣に読まれない言い方へ置き換えたもの
 *   reason   … 称号理由の中核。なぜこの2領域の組み合わせがこの称号になるか
 *
 * 領域そのものの説明は scale-definitions.js が持ち、
 * 文章の組み立ては result-composer.js が行う。
 */
const TABLE = {
  "leadership--organization": [
    "段取りを束ねる進行役", "決めることと整えることを両立する進行派",
    "人を動かす関心と、手順を整える関心が同時に働きます。",
  ],
  "leadership--altruism": [
    "輪を前へ運ぶ推進役", "人に向かう関心を前進力に変える推進派",
    "人へ向かう関心が、引っぱる力と支える力の両方に出ます。",
  ],
  "leadership--creativity": [
    "構想を掲げる旗振り役", "思いついたことを人に伝えて動かす発信派",
    "思いついたことを、人を巻き込むかたちで外へ出そうとします。",
  ],
  "leadership--analysis": [
    "根拠から決める舵取り役", "調べてから方向を示す熟慮派",
    "調べて確かめたうえで方向を決める進み方に惹かれます。",
  ],
  "leadership--production": [
    "現場に立つ牽引役", "現場を離れずに全体を動かす実地派",
    "手を動かす場から離れないまま、全体を動かそうとします。",
  ],
  "leadership--adventure": [
    "先陣を切る開拓役", "未知の場面へ最初に踏み出す先行派",
    "誰も踏んでいない場面へ、最初に足を入れることに惹かれます。",
  ],
  "leadership--erudition": [
    "言葉で導く語り手", "言葉を尽くして人を動かす説得派",
    "言葉を選び、尽くすことで人を動かすほうへ関心が向きます。",
  ],
  "organization--altruism": [
    "場を整えて迎える世話役", "人が動きやすいように先回りする準備派",
    "人のために、先に段取りを済ませておくほうです。",
  ],
  "organization--creativity": [
    "型と遊びを行き来する設計役", "整えることとつくることを行き来する設計派",
    "きちんと整える楽しさと、崩してつくる楽しさの両方があります。",
  ],
  "organization--analysis": [
    "数字を突き合わせる検証役", "記録と根拠を照らし合わせる確認派",
    "記録と根拠を突き合わせる作業に、気持ちが落ち着きます。",
  ],
  "organization--production": [
    "順序立てて仕上げる実務役", "手順を決めてから手を動かす堅実派",
    "先に手順を決め、それから手を動かす進め方に惹かれます。",
  ],
  "organization--adventure": [
    "備えてから飛び込む実行役", "準備を固めてから思い切る用意周到派",
    "思い切って動く前に、準備を固めておきたいほうです。",
  ],
  "organization--erudition": [
    "書き留めて整える記録役", "集めて整理し、残るかたちにする記録派",
    "情報を集め、整理し、あとに残るかたちにすることに惹かれます。",
  ],
  "altruism--creativity": [
    "気持ちを形にする表現役", "人への関心をかたちにして届ける表現派",
    "人へ向ける関心が、つくる行為として外へ出ます。",
  ],
  "altruism--analysis": [
    "人を理解しようとする観察役", "相手を知ろうとして手を伸ばす理解派",
    "相手を支えたい気持ちと、仕組みを知りたい気持ちが結びつきます。",
  ],
  "altruism--production": [
    "手を貸して支える働き手", "支える気持ちを具体的な作業に変える実働派",
    "支えたい気持ちが、そのまま具体的な作業になります。",
  ],
  "altruism--adventure": [
    "現場へ駆けつける行動役", "人のために体を動かす現場派",
    "人のために身体を動かす場面へ、迷わず向かうほうです。",
  ],
  "altruism--erudition": [
    "言葉で寄り添う伝え手", "言葉を選んで人に届ける伝達派",
    "言葉を選び、相手に届くかたちにすることへ関心が向きます。",
  ],
  "creativity--analysis": [
    "仮説を立てて試す発案役", "思いつきと確かめる手つきが同時に働く発想派",
    "思いつくことと、それを確かめることが同時に働きます。",
  ],
  "creativity--production": [
    "手で作りあげる造形役", "頭にあるものを手仕事にする造形派",
    "頭のなかにあるものを、実際の手仕事としてかたちにします。",
  ],
  "creativity--adventure": [
    "思いつきをすぐ試す実験役", "寝かせずにまず動いてみる行動派",
    "頭のなかで寝かせるより、まず動いてみるほうです。",
  ],
  "creativity--erudition": [
    "物語を編む書き手", "言葉と発想を組み合わせてまとめる執筆派",
    "言葉と発想を組み合わせ、まとまりのあるかたちにします。",
  ],
  "analysis--production": [
    "仕組みを解いて直す技術役", "理屈と手の動きが一続きになる技術派",
    "理屈を確かめることと、手で扱うことが一続きになります。",
  ],
  "analysis--adventure": [
    "未知を確かめに行く探検役", "知りたいことのために現場へ出る踏査派",
    "知りたいことがあると、そのために現場まで出ていきます。",
  ],
  "analysis--erudition": [
    "資料を読み解く探索役", "読み、調べ、突き合わせる調査派",
    "読み、調べ、突き合わせる時間に、気持ちが落ち着きます。",
  ],
  "production--adventure": [
    "体を使って向き合う実践役", "屋外や身体を使う場面に向かう実践派",
    "屋外や身体を使う場面に、強く惹かれます。",
  ],
  "production--erudition": [
    "知識を手仕事に落とす作り手", "調べたことを扱えるかたちにする応用派",
    "調べたことを、実際に手で扱えるかたちへ持っていきます。",
  ],
  "adventure--erudition": [
    "見聞を広げる旅の記録役", "外へ出ることと書き留めることが両立する見聞派",
    "外へ出ていくことと、書き留めることの両方があります。",
  ],
};

function buildAll() {
  const entries = [];
  for (let i = 0; i < SCALE_ORDER.length; i += 1) {
    for (let j = i + 1; j < SCALE_ORDER.length; j += 1) {
      const key = `${SCALE_ORDER[i]}--${SCALE_ORDER[j]}`;
      const row = TABLE[key];
      if (!row) throw new TypeError(`TYPE_DEFINITION_MISSING: ${key}`);
      entries.push(Object.freeze({
        typeId: buildTypeId(SCALE_ORDER[i], SCALE_ORDER[j]),
        scaleIds: Object.freeze([SCALE_ORDER[i], SCALE_ORDER[j]]),
        name: row[0],
        subtitle: row[1],
        reason: row[2],
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
  name: "称号を決められませんでした",
  subtitle: "8つの領域が横ならびになった回答",
  reason: "8つの領域すべてに同じくらいの答えが並んだため、あなたの中での高い・低いを取り出せませんでした。",
  detail: "もう一度答えるときは、少しでも心が動くほうへ寄せてみてください。下のレーダーには、いま答えた内容がそのまま出ています。",
});
