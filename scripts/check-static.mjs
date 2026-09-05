// MVPは自オリジン以外へ通信しない。解析タグ・フォントCDN・エラー収集を入れない。
// 出典として画面に置く外部リンク（<a href>）だけを許可リストで認める。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { appMeta } from "../app/js/config/app-meta.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "app");

// 許可してよいのは「出典」と「姉妹アプリ（ココロパレア）」だけ。
// **職業サイトなど、利用者を職業の提示へ送る導線は載せない**（要件定義書 §7-3）。
// ココロパレアは連携相手そのもので、職業を提示する先ではないため対象外とする（v1.18）。
export const ALLOWED_LINK_URLS = Object.freeze([
  "https://projects.ori.org/lrg/PDFs_papers/Pozzebon_etal_2009_ORVIS_JPA.pdf",
  "https://ipip.ori.org/",
  "https://kokoro.sikumilab.com/",
]);

// XMLの名前空間識別子。取得は発生しない（SVGを組み立てるときに必ず現れる）。
export const ALLOWED_NAMESPACE_URLS = Object.freeze(["http://www.w3.org/2000/svg"]);

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

    if (ext === ".html") {
      // 読み込みを起こす属性に外部URLがあってはならない
      for (const m of source.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/g)) {
        if (/^https?:/.test(m[1])) problems.push(`${rel}: src が外部を指している ${m[1]}`);
      }
      for (const m of source.matchAll(/<link\b[^>]*>/g)) {
        const href = m[0].match(/href\s*=\s*["']([^"']+)["']/)?.[1] ?? "";
        if (!/^https?:/.test(href)) continue;
        if (!/rel\s*=\s*["']canonical["']/.test(m[0])) {
          problems.push(`${rel}: link が外部を読み込んでいる ${href}`);
        } else if (!href.startsWith(appMeta.siteOrigin)) {
          problems.push(`${rel}: canonical が siteOrigin と食い違う ${href}`);
        }
      }
      // canonical・OGPのURLは取得を起こさない。ただし自サイトの外を指してはならない。
      for (const m of source.matchAll(/<meta\b[^>]*>/g)) {
        const content = m[0].match(/content\s*=\s*["']([^"']+)["']/)?.[1] ?? "";
        if (/^https?:/.test(content) && !content.startsWith(appMeta.siteOrigin)) {
          problems.push(`${rel}: metaが外部URLを指している ${content}`);
        }
      }
      for (const m of source.matchAll(/<a\b[^>]*>/g)) {
        const href = m[0].match(/href\s*=\s*["']([^"']+)["']/)?.[1] ?? "";
        if (/^https?:/.test(href) && !ALLOWED_LINK_URLS.includes(href)) {
          problems.push(`${rel}: 許可されていない外部リンク ${href}`);
        }
      }
      if (/url\(\s*['"]?https?:/.test(source)) {
        problems.push(`${rel}: インラインCSSが外部リソースを参照している`);
      }
    }
    if (ext === ".css" && (/url\(\s*['"]?https?:/.test(source) || /@import/.test(source))) {
      problems.push(`${rel}: CSSが外部リソースを参照している`);
    }
    if (ext === ".js") {
      for (const token of FORBIDDEN_JS) {
        if (source.includes(token)) problems.push(`${rel}: 通信APIを使っている (${token})`);
      }
      for (const url of source.match(/https?:\/\/[^"'`\s)]+/g) ?? []) {
        if (ALLOWED_LINK_URLS.includes(url) || ALLOWED_NAMESPACE_URLS.includes(url)) continue;
        // 自サイトのURL文字列（canonical等の正典）。通信APIは上のFORBIDDEN_JSで別途禁じている。
        if (url.startsWith(appMeta.siteOrigin)) continue;
        problems.push(`${rel}: 許可されていない外部URL ${url}`);
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
