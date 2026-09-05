import test from "node:test";
import assert from "node:assert/strict";
import { receiveBigFive } from "../js/infrastructure/linkage-intake.js";
import { createStore } from "../js/infrastructure/progress-storage.js";
import { createMemoryStorage } from "./helpers.js";

const VALID = "v1-342288401195267";
const AT = new Date("2026-09-05T02:30:00Z");

/** location と history の最小の作り物。置き換えられたURLを記録する。 */
function scene(hash) {
  const replaced = [];
  return {
    replaced,
    location: { hash, pathname: "/", search: "" },
    history: { replaceState: (_s, _t, url) => replaced.push(url) },
    store: createStore({ storage: createMemoryStorage() }),
  };
}

test("正しいコードで来たら保存し、フラグメントを消す", () => {
  const s = scene(`#b5=${VALID}`);
  const link = receiveBigFive({ ...s, now: AT });
  assert.ok(link, "受け取れていない");
  assert.equal(s.store.load().bigFive.factors.extraversion, 4.01);
  assert.deepEqual(s.replaced, ["/#/start"], "得点がURLに残っている");
});

test("不正なコードでも例外を出さず、保存もせず、フラグメントは消す", () => {
  for (const bad of ["v2-342288401195267", "v1-999", "v1-999288401195267", "v1-"]) {
    const s = scene(`#b5=${bad}`);
    const link = receiveBigFive({ ...s, now: AT });
    assert.equal(link, null, `${bad} を受け取ってしまった`);
    assert.equal(s.store.load().bigFive, null, `${bad} を保存してしまった`);
    assert.deepEqual(s.replaced, ["/#/start"], `${bad} のフラグメントが残る`);
  }
});

test("連携のハッシュでなければ何もしない（URLを触らない）", () => {
  for (const hash of ["#/start", "#/result", "", "#"]) {
    const s = scene(hash);
    assert.equal(receiveBigFive({ ...s, now: AT }), null);
    assert.deepEqual(s.replaced, [], `${hash} でURLを書き換えている`);
  }
});

test("連携を止めているときは受け取らない（キルスイッチ）", () => {
  const s = scene(`#b5=${VALID}`);
  const link = receiveBigFive({ ...s, now: AT, enabled: false });
  assert.equal(link, null);
  assert.equal(s.store.load().bigFive, null);
  // 止めていても得点はURLから消す。共有時に漏らさないことのほうが優先。
  assert.deepEqual(s.replaced, ["/#/start"]);
});

test("history が使えなくても受け取り自体は成立する", () => {
  const s = scene(`#b5=${VALID}`);
  const link = receiveBigFive({
    ...s, now: AT,
    history: { replaceState() { throw new Error("SecurityError"); } },
  });
  assert.ok(link, "履歴APIの失敗で受け取りごと落ちている");
  assert.equal(s.store.load().bigFive.codeVersion, "v1");
});

test("受け取った結果は個人情報を含まない（得点と日時だけ）", () => {
  const s = scene(`#b5=${VALID}`);
  const link = receiveBigFive({ ...s, now: AT });
  assert.deepEqual(Object.keys(link).sort(),
    ["codeVersion", "factors", "receivedAt", "titleId", "z"]);
});
