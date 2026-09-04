import test from "node:test";
import assert from "node:assert/strict";
import { resolveRoute, hashFor, CANONICAL_HASH, ROUTES } from "../js/infrastructure/router.js";

test("既知のルートを解決する", () => {
  for (const route of ROUTES) assert.equal(resolveRoute(`#/${route}`), route);
});

test("未知・空・不正なハッシュは start へ正規化する", () => {
  for (const hash of ["", "#", "#/", "#/zzz", "#/answer/3", null, undefined, 42]) {
    assert.equal(resolveRoute(hash), "start", String(hash));
  }
});

test("問番号をURLに持たない", () => {
  assert.equal(hashFor("answer"), "#/answer");
  assert.equal(hashFor("nope"), CANONICAL_HASH);
});
