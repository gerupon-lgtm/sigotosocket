import test from "node:test";
import assert from "node:assert/strict";
import { checkStatic } from "../../scripts/check-static.mjs";

test("MVPは自オリジン以外へ通信せず、外部リソースも読み込まない", () => {
  assert.deepEqual(checkStatic(), []);
});

test("ブラウザが読みに行くファイルの拡張子を、devサーバーが正しいMIMEで返す", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const { extname } = await import("node:path");

  const source = await readFile(new URL("../dev-server.mjs", import.meta.url), "utf8");
  const table = source.match(/const TYPES = \{([\s\S]*?)\n\};/)?.[1];
  assert.ok(table, "dev-server.mjs の MIME 表を読み取れない");
  const known = new Set([...table.matchAll(/"(\.[a-z0-9]+)":/g)].map((m) => m[1]));

  const found = new Map();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
      if (entry.isDirectory()) await walk(child);
      else found.set(extname(entry.name), entry.name);
    }
  };
  // ブラウザが取りに行くのはこの4つと index.html だけ。tests/ と dev-server.mjs は配信しない。
  for (const dir of ["assets/", "css/", "js/", "manifest/"]) {
    await walk(new URL(`../${dir}`, import.meta.url));
  }
  found.set(".html", "index.html");

  for (const [ext, example] of found) {
    assert.ok(known.has(ext), `${ext}（${example}）が dev-server.mjs の MIME 表に無い`);
  }
});
