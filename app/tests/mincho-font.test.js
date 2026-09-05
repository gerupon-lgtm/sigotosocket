import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TypeDefinitions, UNDETERMINED_TEXT } from "../js/data/type-definitions.js";
import { TEXT } from "../js/presentation/card-layout.js";
import { minchoTexts, minchoChars } from "../js/presentation/mincho-coverage.js";

test("明朝で描く文字列は、称号28件・判定不能時の見出し・2つのピルの文言", () => {
  const texts = minchoTexts();
  for (const type of TypeDefinitions) {
    assert.ok(texts.includes(type.name), `称号「${type.name}」が入っていない`);
  }
  assert.ok(texts.includes(UNDETERMINED_TEXT.name));
  assert.ok(texts.includes(TEXT.titlePill));
  assert.ok(texts.includes(TEXT.footerPill));
  assert.equal(texts.length, TypeDefinitions.length + 3);
});

test("文字の一覧は重複がなく、明朝で描く全文字列を覆う", () => {
  const chars = minchoChars();
  assert.equal(new Set(chars).size, chars.length, "重複がある");
  for (const text of minchoTexts()) {
    for (const ch of text) assert.ok(chars.includes(ch), `「${ch}」が一覧にない`);
  }
});

const FONT_PATH = new URL("../assets/fonts/sigotosocket-mincho.woff2", import.meta.url);

test("同梱するサブセットに、明朝で描く全文字のグリフがある", async () => {
  const { readCodepoints } = await import("../../scripts/fonts/woff2-cmap.mjs");
  const covered = readCodepoints(readFileSync(FONT_PATH));
  const missing = minchoChars().filter((ch) => !covered.has(ch.codePointAt(0)));
  assert.deepEqual(missing, [], `サブセットに無い文字: ${missing.join("")}`);
});

test("サブセットは必要な字だけを持つ（全部入りではないことの確認）", async () => {
  const { readCodepoints } = await import("../../scripts/fonts/woff2-cmap.mjs");
  const covered = readCodepoints(readFileSync(FONT_PATH));
  const required = new Set(minchoChars());
  // 称号に出てこない常用漢字。これが入っていたらサブセットが効いていないか、
  // 読み取り側が符号位置を素通しにしている。
  for (const ch of ["猫", "鬱", "犬", "雨"]) {
    if (required.has(ch)) continue;
    assert.ok(!covered.has(ch.codePointAt(0)), `「${ch}」まで入っている`);
  }
  assert.ok(covered.size < 400, `字数が多すぎる: ${covered.size}`);
});

test("CSP は自オリジンのフォントだけを許す", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const csp = html.match(/http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/)?.[1];
  assert.ok(csp, "CSP のメタタグが無い");
  assert.ok(/font-src 'self'/.test(csp), `font-src 'self' が無い: ${csp}`);
  assert.ok(!/font-src[^;]*https?:/.test(csp), "外部オリジンのフォントを許している");
});

test("明朝で描く箇所を増やしたら、カバレッジ定義も直す", () => {
  const source = readFileSync(new URL("../js/infrastructure/card-renderer.js", import.meta.url), "utf8");
  const uses = source.match(/family: MINCHO/g) ?? [];
  // 「あなたの称号」ピル・称号そのもの・「45問 詳細結果」ピルの3箇所。
  // 増やしたときは mincho-coverage.js の minchoTexts() にもその文字列を足すこと。
  assert.equal(uses.length, 3, `MINCHO の利用箇所が ${uses.length} 箇所ある。mincho-coverage.js を見直すこと`);
});

test("同梱フォントの出典と許諾を置いている", () => {
  const license = readFileSync(new URL("../assets/fonts/OFL.txt", import.meta.url), "utf8");
  assert.ok(license.includes("SIL OPEN FONT LICENSE Version 1.1"), "OFL 1.1 の本文が無い");
  assert.ok(license.includes("Adobe"), "元フォントの著作権表示が無い");
  assert.ok(license.includes("Noto Serif JP"), "元フォント名が無い");
});
