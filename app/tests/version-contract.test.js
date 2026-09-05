import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { appMeta } from "../js/config/app-meta.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("版数の形式と反映先が一致する", () => {
  assert.match(appMeta.appVersion, /^v\d+\.\d+\.\d+$/);
  assert.equal(appMeta.storageKey, `${appMeta.appId}:v${appMeta.storageSchemaVersion}`);
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.name, appMeta.appId);
});

test("連携の受け取りは有効。LLM推敲はT-031で不採用", () => {
  // 受け取り（F-010・T-025）は 2026-09-05 に本人の許可を得て実装した。
  assert.equal(appMeta.linkageEnabled, true);
  // 推敲（F-007・T-031）は不採用。エンドポイントを置くと外部通信が生まれる。
  assert.equal(appMeta.llmEndpoint, null);
});

test("ココロパレアへの案内はシゴトソケット専用入口へ向く", () => {
  assert.equal(
    appMeta.brand.siblingLinkageUrl,
    "https://kokoro.sikumilab.com/#/sigotosocket",
  );
  assert.equal(appMeta.brand.siblingUrl, "https://kokoro.sikumilab.com/");
});
