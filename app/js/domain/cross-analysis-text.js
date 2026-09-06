/**
 * ココロパレアとシゴトソケットを組み合わせた説明（F-012・T-047）。
 *
 * 2アプリの結果を同じ一文へ詰め込まず、出どころと意味を分けて説明する。
 * 研究上の相関は主本文から外し、利用者が開ける補足として返す。
 * LLMは使わず、ここに置いた定型文をそのまま表示する。
 */

/** 節の前書き。全員へ1回だけ表示する。 */
export const CONSISTENCY_PREAMBLE = Object.freeze([
  "ここでは、ココロパレアの結果から見えた「性格の傾向」と、"
    + "シゴトソケットの結果から見えた「仕事でやってみたい活動」を見比べます。",
  "同じ方向に出ることも、別々に出ることもあります。"
    + "どちらが正しい・間違いということではありません。",
]);

/** 6ペアすべてが表示条件を満たさない場合も、結果として明示する。 */
export const CONSISTENCY_NONE = Object.freeze([
  "6つの組み合わせの中に、高め・低めの組み合わせとして今回取り上げるものはありませんでした。"
    + "これも結果のひとつです。",
]);

/** 研究補足に共通で示す、相関係数の最小限の読み方。 */
export const CORRELATION_GUIDE = "相関係数の r は、−1から＋1までの数字で、2つの項目の関係を表します。"
  + "0に近いほど関係が弱く、＋1に近いほど同じ方向に、−1に近いほど反対方向に出やすいことを示します。";

function freezePair(pair) {
  return Object.freeze({
    ...pair,
    factor: Object.freeze(pair.factor),
    scale: Object.freeze(pair.scale),
    interpretation: Object.freeze(pair.interpretation),
    research: Object.freeze({ ...pair.research, lines: Object.freeze(pair.research.lines) }),
  });
}

/** 同じ因子・尺度が複数ペアへ出ても、説明文の正典は1か所に保つ。 */
const FACTOR_COPY = Object.freeze({
  intellectImagination: Object.freeze({
    headingHigh: "考えや発想を広げる傾向は強め",
    headingLow: "考えや発想を広げる傾向は控えめ",
    high: "考えや発想を広げることを好む傾向が、あなたの中で強く出ています。",
    low: "具体的で身近な事柄を好む傾向が、あなたの中で強く出ています。",
  }),
  agreeableness: Object.freeze({
    headingHigh: "相手の気持ちや協力を重視する傾向は強め",
    headingLow: "相手の気持ちや協力を重視する傾向は控えめ",
    high: "相手の気持ちや協力を重視する傾向が、あなたの中で強く出ています。",
    low: "率直に意見を伝える傾向が、あなたの中で強く出ています。",
  }),
  extraversion: Object.freeze({
    headingHigh: "人との交流を好む傾向は強め",
    headingLow: "人との交流を好む傾向は控えめ",
    high: "人との交流を好む傾向が、あなたの中で強く出ています。",
    low: "一人で過ごす場面を好む傾向が、あなたの中で強く出ています。",
  }),
  conscientiousness: Object.freeze({
    headingHigh: "計画や整理を重視する傾向は強め",
    headingLow: "計画や整理を重視する傾向は控えめ",
    high: "計画や整理を重視する傾向が、あなたの中で強く出ています。",
    low: "進め方をその都度柔軟に変える傾向が、あなたの中で強く出ています。",
  }),
});

const SCALE_COPY = Object.freeze({
  creativity: Object.freeze({
    headingHigh: "新しいものを形にする活動への関心は高め",
    headingLow: "新しいものを形にする活動への関心は低め",
    high: "新しいものを考え、形にする活動への関心が、強く出ています。",
    low: "新しいものを考え、形にする活動への関心は、強く出ていません。",
  }),
  erudition: Object.freeze({
    headingHigh: "言葉や知識を扱う活動への関心は高め",
    headingLow: "言葉や知識を扱う活動への関心は低め",
    high: "言葉や知識を扱い、読み書きしたり調べたりする活動への関心が、強く出ています。",
    low: "言葉や知識を扱い、読み書きしたり調べたりする活動への関心は、強く出ていません。",
  }),
  leadership: Object.freeze({
    headingHigh: "人を率いる活動への関心は高め",
    headingLow: "人を率いる活動への関心は低め",
    high: "人をまとめたり、先頭に立って方向を決めたりする活動への関心が、強く出ています。",
    low: "人をまとめたり、先頭に立って方向を決めたりする活動への関心は、強く出ていません。",
  }),
  altruism: Object.freeze({
    headingHigh: "人を支える活動への関心は高め",
    headingLow: "人を支える活動への関心は低め",
    high: "人を支え、その人の力になる活動への関心が、強く出ています。",
    low: "人を支え、その人の力になる活動への関心は、強く出ていません。",
  }),
  organization: Object.freeze({
    headingHigh: "数字や手順を整える活動への関心は高め",
    headingLow: "数字や手順を整える活動への関心は低め",
    high: "数字や手順を整え、滞りなく回す活動への関心が、強く出ています。",
    low: "数字や手順を整え、滞りなく回す活動への関心は、強く出ていません。",
  }),
});

/** 対象の6ペア。順序とrは processing-design §8 の表を維持する。 */
export const CONSISTENCY_PAIRS = Object.freeze([
  freezePair({
    factorId: "intellectImagination", scaleId: "creativity", r: 0.30,
    factor: FACTOR_COPY.intellectImagination,
    scale: SCALE_COPY.creativity,
    interpretation: {
      factorHighScaleHigh: "この2つを合わせると、考えや発想を広げながら、新しいものを形にする活動がしっくりくるのかもしれません。",
      factorLowScaleLow: "この2つを合わせると、新しいものを考えて形にするより、具体的なものを扱うほうがしっくりくるのかもしれません。",
      factorHighScaleLow: "この2つを合わせると、考えや発想を広げることは好きでも、それを新しい形にする活動は別なのかもしれません。",
      factorLowScaleHigh: "この2つを合わせると、考えを広げること自体より、必要なものを実際の形にする活動に惹かれるのかもしれません。",
    },
    research: { lines: [
      "参考として、英語原版の調査では、「知性・想像力」と「創造」の間に弱い正の相関（r=.30）が報告されています。",
      "この2つは同じ方向に出ることが少し多いものの、強い関係ではありません。",
    ] },
  }),
  freezePair({
    factorId: "intellectImagination", scaleId: "erudition", r: 0.34,
    factor: FACTOR_COPY.intellectImagination,
    scale: SCALE_COPY.erudition,
    interpretation: {
      factorHighScaleHigh: "この2つを合わせると、考えや発想を広げ、それを言葉や知識で掘り下げる活動がしっくりくるのかもしれません。",
      factorLowScaleLow: "この2つを合わせると、言葉や知識を広げるより、具体的で身近なことを扱うほうがしっくりくるのかもしれません。",
      factorHighScaleLow: "この2つを合わせると、自分で考えを広げることは好きでも、言葉や知識を扱う活動は別なのかもしれません。",
      factorLowScaleHigh: "この2つを合わせると、発想を広げること自体より、言葉や知識を扱う活動に惹かれるのかもしれません。",
    },
    research: { lines: [
      "参考として、英語原版の調査では、「知性・想像力」と「言葉」の間に弱い正の相関（r=.34）が報告されています。",
      "この2つは同じ方向に出ることが少し多いものの、強い関係ではありません。",
    ] },
  }),
  freezePair({
    factorId: "intellectImagination", scaleId: "leadership", r: 0.29,
    factor: FACTOR_COPY.intellectImagination,
    scale: SCALE_COPY.leadership,
    interpretation: {
      factorHighScaleHigh: "この2つを合わせると、自分の考えを広げ、それを周りに示しながら進める活動がしっくりくるのかもしれません。",
      factorLowScaleLow: "この2つを合わせると、考えを広げたり人を率いたりするより、具体的なことに自分の持ち場で取り組むほうがしっくりくるのかもしれません。",
      factorHighScaleLow: "この2つを合わせると、人を率いるよりも、自分で考え、自分の持ち場で動くほうがしっくりくるのかもしれません。",
      factorLowScaleHigh: "この2つを合わせると、新しい発想を広げることよりも、目の前の人や状況をまとめて進める活動に惹かれるのかもしれません。",
    },
    research: { lines: [
      "参考として、英語原版の調査では、「知性・想像力」と「統率」の間に弱い正の相関（r=.29）が報告されています。",
      "この2つは同じ方向に出ることが少し多いものの、強い関係ではありません。",
    ] },
  }),
  freezePair({
    factorId: "agreeableness", scaleId: "altruism", r: 0.42,
    factor: FACTOR_COPY.agreeableness,
    scale: SCALE_COPY.altruism,
    interpretation: {
      factorHighScaleHigh: "この2つを合わせると、相手と協力しながら、人を支える活動がしっくりくるのかもしれません。",
      factorLowScaleLow: "この2つを合わせると、人に合わせたり支援役になったりするより、別の関わり方がしっくりくるのかもしれません。",
      factorHighScaleLow: "この2つを合わせると、相手の気持ちは大切にする一方で、人を支えること自体を仕事の中心にするかは別なのかもしれません。",
      factorLowScaleHigh: "この2つを合わせると、率直に意見を伝えながら、必要な人を支える活動がしっくりくるのかもしれません。",
    },
    research: { lines: [
      "参考として、英語原版の調査では、「協調性」と「支援」の間に正の相関（r=.42）が報告されています。",
      "この2つは同じ方向に出る傾向がありますが、いつも一致するほど強い関係ではありません。",
    ] },
  }),
  freezePair({
    factorId: "extraversion", scaleId: "leadership", r: 0.38,
    factor: FACTOR_COPY.extraversion,
    scale: SCALE_COPY.leadership,
    interpretation: {
      factorHighScaleHigh: "この2つを合わせると、人と関わりながら、周りをまとめて進める活動がしっくりくるのかもしれません。",
      factorLowScaleLow: "この2つを合わせると、大勢と関わったり先頭に立ったりするより、一人で自分の持ち場を進めるほうがしっくりくるのかもしれません。",
      factorHighScaleLow: "この2つを合わせると、人と関わることは好きでも、先頭に立ってまとめる役割は別なのかもしれません。",
      factorLowScaleHigh: "この2つを合わせると、普段は一人で過ごす場面を好んでも、必要な場面では周りをまとめる活動に惹かれるのかもしれません。",
    },
    research: { lines: [
      "参考として、英語原版の調査では、「外向性」と「統率」の間に正の相関（r=.38）が報告されています。",
      "この2つは同じ方向に出る傾向がありますが、いつも一致するほど強い関係ではありません。",
    ] },
  }),
  freezePair({
    factorId: "conscientiousness", scaleId: "organization", r: 0.20,
    factor: FACTOR_COPY.conscientiousness,
    scale: SCALE_COPY.organization,
    interpretation: {
      factorHighScaleHigh: "この2つを合わせると、計画を立て、数字や手順を整えて進める活動がしっくりくるのかもしれません。",
      factorLowScaleLow: "この2つを合わせると、決まった計画や手順を整えるより、その都度やり方を変えて進めるほうがしっくりくるのかもしれません。",
      factorHighScaleLow: "この2つを合わせると、計画や整理は大切にしても、数字や手順を整えること自体を仕事の中心にするかは別なのかもしれません。",
      factorLowScaleHigh: "この2つを合わせると、進め方は柔軟に変えながらも、仕事では数字や手順を整える活動に惹かれるのかもしれません。",
    },
    research: { lines: [
      "参考として、英語原版の調査では、「勤勉性」と「段取り」の間に弱い正の相関（r=.20）が報告されています。",
      "この2つは同じ方向に出ることが少し多いものの、強い関係ではありません。",
    ] },
  }),
]);

/** 本人内の順位とzの向きを言葉へ変換する。集団比較には使わない。 */
export function positionPhrase(position, total, high = position * 2 <= total) {
  if (high) return position === 1 ? "いちばん高く出ています" : "高いほうです";
  return position === total ? "いちばん低く出ています" : "低いほうです";
}

export function pastPositionPhrase(position, total, high = position * 2 <= total) {
  if (high) return position === 1 ? "いちばん高く出ました" : "高いほうでした";
  return position === total ? "いちばん低く出ました" : "低いほうでした";
}
