// 版数の同値検証。複数箇所に値を持つ場合の更新漏れを検出する。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { appMeta } from "../../app/js/config/app-meta.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const problems = [];

if (!/^v\d+\.\d+\.\d+$/.test(appMeta.appVersion)) {
  problems.push(`appVersion の形式が v0.0.0 でない: ${appMeta.appVersion}`);
}
if (appMeta.storageKey !== `${appMeta.appId}:v${appMeta.storageSchemaVersion}`) {
  problems.push(`storageKey と appId/storageSchemaVersion が一致しない: ${appMeta.storageKey}`);
}
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
if (pkg.name !== appMeta.appId) {
  problems.push(`package.json の name (${pkg.name}) と appId (${appMeta.appId}) が一致しない`);
}

if (problems.length > 0) {
  console.error("版数の検証に失敗しました:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`版数 OK: ${appMeta.appVersion} / storageKey=${appMeta.storageKey}`);
