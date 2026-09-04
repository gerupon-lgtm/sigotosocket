import { SCALE_ORDER } from "./scale-order.js";

const TABLE = {
  leadership: { labelJa: "リーダーシップ", labelEn: "Leadership", holland: "企業的（Enterprising）", itemCount: 5,
    highNote: "人を動かし、方向を決める場面に惹かれます。", lowNote: "先頭に立つことより、自分の持ち場で進めることを好みます。" },
  organization: { labelJa: "組織化", labelEn: "Organization", holland: "慣習的（Conventional）", itemCount: 4,
    highNote: "手順や数字を整え、仕組みを保つことに惹かれます。", lowNote: "決まった型を整えるより、その都度やり方を変えることを好みます。" },
  altruism: { labelJa: "利他性", labelEn: "Altruism", holland: "社会的（Social）", itemCount: 6,
    highNote: "人を支え、力になる場面に惹かれます。", lowNote: "人を支える役割そのものより、別の関わり方を好みます。" },
  creativity: { labelJa: "創造性", labelEn: "Creativity", holland: "芸術的（Artistic）", itemCount: 6,
    highNote: "形のないものを形にすることに惹かれます。", lowNote: "表現をつくることより、既にあるものを扱うことを好みます。" },
  analysis: { labelJa: "分析", labelEn: "Analysis", holland: "研究的（Investigative）", itemCount: 4,
    highNote: "調べ、確かめ、筋道を立てることに惹かれます。", lowNote: "理屈を突き詰めるより、先に動くことを好みます。" },
  production: { labelJa: "生産", labelEn: "Production", holland: "現実的（Realistic）", itemCount: 7,
    highNote: "手を動かし、ものや生きものを扱うことに惹かれます。", lowNote: "手を動かす作業より、別の関わり方を好みます。" },
  adventure: { labelJa: "冒険", labelEn: "Adventure", holland: "現実的（Realistic）", itemCount: 6,
    highNote: "体を使い、刺激のある場面に惹かれます。", lowNote: "刺激や競争より、落ち着いた場面を好みます。" },
  erudition: { labelJa: "学識", labelEn: "Erudition", holland: "直接対応なし", itemCount: 7,
    highNote: "言葉と知識を扱い、読み書きすることに惹かれます。", lowNote: "言葉や知識を扱うことより、別の関わり方を好みます。" },
};

export const ScaleDefinitions = Object.freeze(
  SCALE_ORDER.map((scaleId, index) =>
    Object.freeze({ scaleId, order: index + 1, ...TABLE[scaleId] })),
);

export const ScaleById = Object.freeze(
  Object.fromEntries(ScaleDefinitions.map((scale) => [scale.scaleId, scale])),
);
