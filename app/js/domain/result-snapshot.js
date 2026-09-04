import { appMeta } from "../config/app-meta.js";
import { SCALE_ORDER } from "../data/scale-order.js";

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 日時はUTCのISO 8601で保存する。表示側でローカルへ変換する。 */
export function nowIsoUtc(now = new Date()) {
  return new Date(now.getTime()).toISOString();
}

export function createResultSnapshot({ standardized, classification, now = new Date() }) {
  const { diagnosticVersions } = appMeta;
  return Object.freeze({
    resultId: randomId(),
    createdAt: nowIsoUtc(now),
    scaleScores: Object.freeze(standardized.scaleScores.map((score) => Object.freeze({
      scaleId: score.scaleId,
      raw: score.raw,
      z: score.z,
    }))),
    standardizable: standardized.standardizable,
    rank: classification.rank ? Object.freeze([...classification.rank]) : null,
    primaryTypeId: classification.primaryTypeId,
    alternativeTypeId: classification.alternativeTypeId,
    poseScaleId: classification.poseScaleId,
    propScaleId: classification.propScaleId,
    bigFive: null,
    versions: Object.freeze({
      appVersion: appMeta.appVersion,
      itemSetVersion: diagnosticVersions.itemSetVersion,
      scoringVersion: diagnosticVersions.scoringVersion,
      typeRuleVersion: diagnosticVersions.typeRuleVersion,
      cardTemplateVersion: appMeta.cardTemplateVersion,
    }),
  });
}

export function isValidSnapshot(value) {
  return Boolean(value)
    && typeof value === "object"
    && typeof value.resultId === "string"
    && typeof value.createdAt === "string"
    && Array.isArray(value.scaleScores)
    && value.scaleScores.length === SCALE_ORDER.length;
}
