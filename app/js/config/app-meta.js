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
  // 姉妹アプリ。連携（F-010）の相手であり、リンクは check-static の許可リストに載せている
  siblingName: "ココロパレア",
  siblingUrl: "https://kokoro.sikumilab.com/",
  // 任意連携の案内からだけ使う専用入口。通常の姉妹アプリ紹介リンクとは分ける。
  siblingLinkageUrl: "https://kokoro.sikumilab.com/#/sigotosocket",
  subtitle: "ORVIS 自己理解支援ツール",
  iconPath: "assets/brand/sigotosocket-mark.svg",
});

export const appMeta = Object.freeze({
  brand,
  appId: "sigotosocket",
  appVersion: "v0.2.3",
  // 公開URL（2026-09-05 確定・要確認21を解消）。index.html の canonical / og:url と一致させること。
  siteOrigin: "https://sigotosocket.sikumilab.com",
  storageSchemaVersion: 1,
  storageKey: "sigotosocket:v1",
  // v3: 連携前後の構図とココロパレア表示帯を統一（F-018・F-020・F-022、D-25）
  cardTemplateVersion: "card-template-v3",
  characterManifestVersion: "character-manifest-v1",
  diagnosticVersions,
  releasedAt: null,
  // ココロパレアの結果コード受け取りと掛け合わせ表示（F-010〜F-014）を実装済み。
  // 連携を止めたいときはここを false にする。
  linkageEnabled: true,
  // T-031でローカルLLMは不採用。外部通信ゼロを維持する。
  llmEndpoint: null,
});
