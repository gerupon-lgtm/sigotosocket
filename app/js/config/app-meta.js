const diagnosticVersions = Object.freeze({
  scaleId: "orvis-ja-45",
  scaleVersion: "orvis-ja-45-v1",
  itemSetVersion: "orvis-ja-45-item-set-v1",
  scoringVersion: "orvis-ja-45-scoring-v1",
  typeRuleVersion: "type-rule-v1",
  resultTextVersion: "result-text-v1",
});

export const appMeta = Object.freeze({
  appId: "sigotosocket",
  appVersion: "v0.1.0",
  // 【仮】サブドメイン未確定（検討事項21）。index.html の canonical / og:url と一致させること。
  siteOrigin: "https://sigotosocket.sikumilab.com",
  storageSchemaVersion: 1,
  storageKey: "sigotosocket:v1",
  cardTemplateVersion: "card-template-v1",
  characterManifestVersion: "character-manifest-v1",
  diagnosticVersions,
  releasedAt: null,
  linkageEnabled: false,
  llmEndpoint: null,
});
