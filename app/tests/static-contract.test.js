import test from "node:test";
import assert from "node:assert/strict";
import { checkStatic } from "../../scripts/check-static.mjs";

test("MVPは自オリジン以外へ通信せず、外部リソースも読み込まない", () => {
  assert.deepEqual(checkStatic(), []);
});
