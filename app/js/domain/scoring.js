import { SCALE_ORDER } from "../data/scale-order.js";
import { ScaleById } from "../data/scale-definitions.js";

const MIN_ANSWER = 1;
const MAX_ANSWER = 5;

function invalidInput(code) {
  throw new TypeError(code ?? "SCORING_INPUT_INVALID");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * ORVISは尺度ごとの項目数が不均等（5/4/6/6/4/7/6/7）。
 * ココロパレアの scoring.js は「項目数が全因子で均等」を前提に検証しているが、
 * ここでは尺度マスタの itemCount と突き合わせる。
 */
function validate(items, answers) {
  if (!Array.isArray(items) || items.length === 0 || !isRecord(answers)) invalidInput();

  const seen = new Set();
  const countByScale = new Map(SCALE_ORDER.map((scaleId) => [scaleId, 0]));
  for (const item of items) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.length === 0) invalidInput();
    if (!SCALE_ORDER.includes(item.scaleId)) invalidInput("SCORING_SCALE_UNKNOWN");
    if (seen.has(item.id)) invalidInput("SCORING_ITEM_DUPLICATED");
    seen.add(item.id);
    countByScale.set(item.scaleId, countByScale.get(item.scaleId) + 1);
  }
  for (const scaleId of SCALE_ORDER) {
    if (countByScale.get(scaleId) !== ScaleById[scaleId].itemCount) {
      invalidInput("SCORING_ITEM_COUNT_MISMATCH");
    }
  }

  const answerKeys = Object.keys(answers);
  if (answerKeys.length !== items.length) invalidInput("SCORING_ANSWER_COUNT_MISMATCH");
  for (const item of items) {
    const descriptor = Object.getOwnPropertyDescriptor(answers, item.id);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) invalidInput("SCORING_ANSWER_MISSING");
    const value = descriptor.value;
    if (!Number.isInteger(value) || value < MIN_ANSWER || value > MAX_ANSWER) {
      invalidInput("SCORING_ANSWER_OUT_OF_RANGE");
    }
  }
}

function keyedValue(item, answer) {
  // ORVISに逆転項目はないが、将来の診断追加に備えてフィールドは尊重する。
  return item.keyedDirection === "negative" ? (MIN_ANSWER + MAX_ANSWER) - answer : answer;
}

/** 尺度ごとの素点（所属項目の平均、1.00〜5.00）を正準順で返す。 */
export function scoreScales({ items, answers }) {
  validate(items, answers);
  return Object.freeze(SCALE_ORDER.map((scaleId) => {
    const scaleItems = items.filter((item) => item.scaleId === scaleId);
    const sum = scaleItems.reduce((total, item) => total + keyedValue(item, answers[item.id]), 0);
    return Object.freeze({ scaleId, itemCount: scaleItems.length, raw: sum / scaleItems.length });
  }));
}
