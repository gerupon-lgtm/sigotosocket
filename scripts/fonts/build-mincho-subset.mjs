import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";
import { minchoChars, minchoTexts } from "../../app/js/presentation/mincho-coverage.js";
import { readCodepoints } from "./woff2-cmap.mjs";

/**
 * 称号などを描く明朝を、必要な字だけのサブセットにして同梱する。
 *
 *   npm run fonts:build [元フォントのパス]
 *
 * 元は Noto Serif JP（SIL OFL 1.1）。可変フォントなので wght=400 に固定してから
 * 切り出す。固定しないと gvar が残って倍近い大きさになる。
 *
 * 生成物（`app/assets/fonts/`）はgit管理する。CIは node_modules を入れずに
 * `npm test` を走らせるため、**このスクリプトはCIでは動かない。**
 * 称号を足したり直したりしたら、手元でこれを実行して差分を入れること。
 * 実行し忘れは `app/tests/mincho-font.test.js` が落として知らせる。
 */

const ROOT = new URL("../../", import.meta.url);
const OUT_DIR = new URL("app/assets/fonts/", ROOT);
const OUT_FONT = new URL("sigotosocket-mincho.woff2", OUT_DIR);
const WEIGHT = 400;

// 元フォントの置き場所の候補。引数で明示するのが確実。
const SOURCE_CANDIDATES = [
  "C:/Windows/Fonts/NotoSerifJP-VF.ttf",
  "/usr/share/fonts/truetype/noto/NotoSerifJP-VF.ttf",
  "/Library/Fonts/NotoSerifJP-VF.ttf",
];

function resolveSource(argv) {
  if (argv[0]) {
    if (!existsSync(argv[0])) throw new Error(`元フォントが見つかりません: ${argv[0]}`);
    return argv[0];
  }
  const found = SOURCE_CANDIDATES.find((path) => existsSync(path));
  if (found) return found;
  throw new Error(
    "元フォント（Noto Serif JP の可変フォント）が見つかりません。\n"
    + "  npm run fonts:build <NotoSerifJP-VF.ttf のパス>\n"
    + `  探した場所: ${SOURCE_CANDIDATES.join(" / ")}`,
  );
}

const sourcePath = resolveSource(process.argv.slice(2));
const chars = minchoChars();
const source = readFileSync(sourcePath);

const woff2 = await subsetFont(source, chars.join(""), {
  targetFormat: "woff2",
  variationAxes: { wght: WEIGHT },
});

// 書き出す前に、狙った字が本当に入ったかを読み返して確かめる。
const covered = readCodepoints(woff2);
const missing = chars.filter((ch) => !covered.has(ch.codePointAt(0)));
if (missing.length > 0) {
  throw new Error(`元フォントに無い字があります: ${missing.join("")}`);
}

mkdirSync(fileURLToPath(OUT_DIR), { recursive: true });
writeFileSync(OUT_FONT, woff2);

console.log(
  `フォント OK: ${minchoTexts().length}件の文字列 / ${chars.length}字 / `
  + `${(woff2.length / 1024).toFixed(1)}KB（収録 ${covered.size}字）\n`
  + `  元: ${sourcePath}（wght=${WEIGHT}に固定）\n`
  + `  先: ${fileURLToPath(OUT_FONT)}`,
);
