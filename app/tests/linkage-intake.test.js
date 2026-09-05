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

/* ---- T-026 後付け連携（F-011） ---- */

const { createResultSnapshot } = await import("../js/domain/result-snapshot.js");
const { attachBigFive } = await import("../js/domain/result-snapshot.js");
const { standardize } = await import("../js/domain/standardize.js");
const { scoreScales } = await import("../js/domain/scoring.js");
const { classify } = await import("../js/domain/type-classifier.js");
const { ItemMaster } = await import("../js/data/item-master.js");
const { answersWith } = await import("./helpers.js");

function completedSnapshot() {
  const standardized = standardize(scoreScales({
    items: ItemMaster, answers: answersWith((_, i) => (i % 5) + 1),
  }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
}

test("結果に連携を後付けしても、結果そのものは書き換わらない", () => {
  const before = completedSnapshot();
  const link = { factors: {}, z: {}, titleId: null, receivedAt: "x", codeVersion: "v1" };
  const after = attachBigFive(before, link);

  assert.equal(after.bigFive, link);
  assert.equal(after.resultId, before.resultId, "別の結果になってしまっている");
  assert.equal(after.createdAt, before.createdAt);
  assert.deepEqual(after.rank, before.rank);
  assert.equal(after.primaryTypeId, before.primaryTypeId);
  assert.equal(before.bigFive, null, "元の結果を書き換えている");
});

test("連携を外すと bigFive だけ null に戻る", () => {
  const snapshot = attachBigFive(completedSnapshot(), { codeVersion: "v1" });
  assert.equal(attachBigFive(snapshot, null).bigFive, null);
});

test("ORVIS完了後に連携リンクで来ると、再回答なしで既存の結果へ結び付く（F-011）", () => {
  const s = scene(`#b5=${VALID}`);
  const snapshot = completedSnapshot();
  s.store.saveResult(snapshot);

  const link = receiveBigFive({ ...s, now: AT });
  assert.ok(link);

  const saved = s.store.latestResult();
  assert.equal(saved.resultId, snapshot.resultId, "新しい結果が増えている（再回答が起きた形）");
  assert.equal(saved.bigFive.codeVersion, "v1", "既存の結果へ結び付いていない");
  assert.equal(s.store.load().results.length, 1, "結果が増えている");
  assert.equal(s.store.load().progress, null, "回答途中の状態を作っている");
});

test("結果がまだ無いときに連携で来ても壊れない", () => {
  const s = scene(`#b5=${VALID}`);
  assert.ok(receiveBigFive({ ...s, now: AT }));
  assert.equal(s.store.latestResult(), null);
  assert.equal(s.store.load().bigFive.codeVersion, "v1", "連携そのものは保存する");
});

test("不正なコードなら既存の結果に触らない", () => {
  const s = scene("#b5=v2-342288401195267");
  const snapshot = attachBigFive(completedSnapshot(), { codeVersion: "v1" });
  s.store.saveResult(snapshot);

  assert.equal(receiveBigFive({ ...s, now: AT }), null);
  assert.equal(s.store.latestResult().bigFive.codeVersion, "v1", "既存の連携を壊している");
});
