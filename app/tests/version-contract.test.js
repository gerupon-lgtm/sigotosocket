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

test("連携はまだ無効（第2フェーズ。着手前に確認が必要）", () => {
  assert.equal(appMeta.linkageEnabled, false);
  assert.equal(appMeta.llmEndpoint, null);
});
