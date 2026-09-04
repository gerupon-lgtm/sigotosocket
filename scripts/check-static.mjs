// MVPは自オリジン以外へ通信しない。解析タグ・フォントCDN・エラー収集を入れない。
// 出典として画面に置く外部リンク（<a href>）だけを許可リストで認める。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "app");

export const ALLOWED_LINK_URLS = Object.freeze([
  "https://projects.ori.org/lrg/PDFs_papers/Pozzebon_etal_2009_ORVIS_JPA.pdf",
  "https://ipip.ori.org/",
]);

const FORBIDDEN_JS = Object.freeze([
  "fetch(", "XMLHttpRequest", "new WebSocket", "sendBeacon", "importScripts",
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function checkStatic() {
  const problems = [];
  for (const file of walk(APP)) {
    const ext = extname(file);
    if (![".html", ".js", ".css"].includes(ext)) continue;
    const rel = file.slice(ROOT.length + 1);
    const source = readFileSync(file, "utf8");

    if (ext === ".html" && /https?:\/\//.test(source)) {
      problems.push(`${rel}: HTMLに外部URLがある`);
    }
    if (ext === ".css" && (/url\(\s*['"]?https?:/.test(source) || /@import/.test(source))) {
      problems.push(`${rel}: CSSが外部リソースを参照している`);
    }
    if (ext === ".js") {
      for (const token of FORBIDDEN_JS) {
        if (source.includes(token)) problems.push(`${rel}: 通信APIを使っている (${token})`);
      }
      for (const url of source.match(/https?:\/\/[^"'`\s)]+/g) ?? []) {
        if (!ALLOWED_LINK_URLS.includes(url)) problems.push(`${rel}: 許可されていない外部URL ${url}`);
      }
    }
  }
  return problems;
}

// パスに非ASCIIが含まれてもCLI判定が壊れないようURLへ正規化して比較する。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkStatic();
  if (problems.length > 0) {
    console.error("静的検査に失敗しました:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("静的検査 OK: 外部への通信・外部リソースの読み込みはありません");
}
