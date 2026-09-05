const diagnosticVersions = Object.freeze({
  scaleId: "orvis-ja-45",
  scaleVersion: "orvis-ja-45-v1",
  itemSetVersion: "orvis-ja-45-item-set-v1",
  scoringVersion: "orvis-ja-45-scoring-v1",
  typeRuleVersion: "type-rule-v1",
  resultTextVersion: "result-text-v1",
});

/** 画面とカードで使うブランドの文言。**1か所で持つ**（ココロパレアの appMeta.brand に倣う）。 */
const brand = Object.freeze({
  name: "シゴトソケット",
  subtitle: "ORVIS 自己理解支援ツール",
  iconPath: "assets/brand/sigotosocket-mark.svg",
});

export const appMeta = Object.freeze({
  brand,
  appId: "sigotosocket",
  appVersion: "v0.1.0",
  // 公開URL（2026-09-05 確定・要確認21を解消）。index.html の canonical / og:url と一致させること。
  siteOrigin: "https://sigotosocket.sikumilab.com",
  storageSchemaVersion: 1,
  storageKey: "sigotosocket:v1",
  cardTemplateVersion: "card-template-v1",
  characterManifestVersion: "character-manifest-v1",
  diagnosticVersions,
  releasedAt: null,
  // ココロパレアの結果コードの受け取り（F-010・T-025）。受け取りと保存までを実装済み。
  // 掛け合わせの表示（F-012〜F-014）はまだ無い。止めたいときはここを false にする。
  linkageEnabled: true,
  llmEndpoint: null,
});
