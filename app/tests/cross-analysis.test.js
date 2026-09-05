import test from "node:test";
import assert from "node:assert/strict";
import {
  uniqueInterest, UNIQUE_INTEREST_SCALES, UNIQUE_INTEREST_TOP_N,
} from "../js/domain/cross-analysis.js";
import { FORBIDDEN_PHRASES } from "../js/domain/result-composer.js";
import { parseBigFiveCode } from "../js/domain/big-five-link.js";

const LINK = parseBigFiveCode("v1-342288401195267");

test("対象はビッグファイブとほぼ無相関の2尺度だけ（processing-design §9）", () => {
  assert.deepEqual([...UNIQUE_INTEREST_SCALES], ["production", "adventure"]);
  assert.equal(UNIQUE_INTEREST_TOP_N, 2);
});

test("連携していなければ何も出さない", () => {
  assert.equal(uniqueInterest({ rank: ["production", "adventure"], bigFive: null }), null);
});

test("判定不能なら何も出さない", () => {
  assert.equal(uniqueInterest({ rank: null, bigFive: LINK }), null);
});

test("手仕事が上位に入っていれば、固有の興味として出す", () => {
  const result = uniqueInterest({ rank: ["production", "analysis", "adventure"], bigFive: LINK });
  assert.deepEqual(result.scaleIds, ["production"]);
  assert.ok(result.lines.join("").includes("手仕事"));
});

test("挑戦が上位に入っていても出す", () => {
  const result = uniqueInterest({ rank: ["altruism", "adventure", "production"], bigFive: LINK });
  assert.deepEqual(result.scaleIds, ["adventure"]);
  assert.ok(result.lines.join("").includes("挑戦"));
});

test("両方が上位なら1件にまとめ、順位の順に並べる", () => {
  const result = uniqueInterest({ rank: ["adventure", "production", "analysis"], bigFive: LINK });
  assert.deepEqual(result.scaleIds, ["adventure", "production"]);
  const text = result.lines.join("");
  assert.ok(text.indexOf("挑戦") < text.indexOf("手仕事"), "順位の順に並んでいない");
});

test("3位以下なら出さない（上位に入っていることが条件）", () => {
  assert.equal(uniqueInterest({ rank: ["analysis", "altruism", "production"], bigFive: LINK }), null);
});

test("対象外の尺度だけが上位なら出さない。無理に何かを見つけない", () => {
  assert.equal(uniqueInterest({ rank: ["analysis", "erudition", "leadership"], bigFive: LINK }), null);
});

test("予測できないことを根拠にする。性格から導いたと書かない", () => {
  const text = uniqueInterest({ rank: ["production", "adventure"], bigFive: LINK }).lines.join("");
  assert.ok(text.includes("予測"), "予測できないという根拠が書かれていない");
  assert.ok(!text.includes("だから"), "因果でつないでいる");
});

test("禁止語と職業を含まない", () => {
  for (const rank of [["production", "analysis"], ["adventure", "analysis"], ["adventure", "production"]]) {
    const text = uniqueInterest({ rank, bigFive: LINK }).lines.join(" ");
    for (const phrase of FORBIDDEN_PHRASES) {
      assert.ok(!text.includes(phrase), `禁止語「${phrase}」: ${text}`);
    }
    for (const word of ["職業", "適職", "向いている", "才能", "優れ"]) {
      assert.ok(!text.includes(word), `「${word}」が含まれる: ${text}`);
    }
  }
});

/* ---- T-028 ロック予告（F-014） ---- */

test("連携済みなら予告は消える", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  assert.equal(lockPreview({ rank: ["production", "analysis"], bigFive: LINK }), null);
});

test("判定不能なら予告を出さない", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  assert.equal(lockPreview({ rank: null, bigFive: null }), null);
});

test("予告は本人の順位と領域名を名指しする（F-014）", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  const preview = lockPreview({ rank: ["production", "analysis"], bigFive: null });
  const text = preview.lines.join("");
  assert.ok(text.includes("手仕事"), `領域名が無い: ${text}`);
  assert.ok(text.includes("1位"), `順位が無い: ${text}`);
  assert.ok(text.includes("連携"), "連携への導線になっていない");
});

test("2位が対象でも予告を出し、順位を正しく言う", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  const text = lockPreview({ rank: ["analysis", "adventure"], bigFive: null }).lines.join("");
  assert.ok(text.includes("2位の「挑戦」"), `順位の言い方が違う: ${text}`);
  assert.ok(!text.includes("1位の「挑戦」"), "順位を偽っている");
});

test("いま連携しても出せるものが無い人には、予告しない", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  // ②がまだ無いので、手仕事・挑戦が上位に無い人には約束できるものが無い
  assert.equal(lockPreview({ rank: ["analysis", "erudition"], bigFive: null }), null);
});

test("予告と本文は同じ判定から出る（連携の前後で話が食い違わない）", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  for (const rank of [["production", "analysis"], ["analysis", "adventure"], ["analysis", "erudition"]]) {
    const promised = lockPreview({ rank, bigFive: null });
    const delivered = uniqueInterest({ rank, bigFive: LINK });
    assert.equal(Boolean(promised), Boolean(delivered),
      `${rank.join("/")}: 予告と本文の有無が食い違う`);
    if (promised) assert.deepEqual(promised.scaleIds, delivered.scaleIds);
  }
});

test("予告は禁止語を含まず、断定もしない", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  const text = lockPreview({ rank: ["production", "adventure"], bigFive: null }).lines.join(" ");
  for (const phrase of FORBIDDEN_PHRASES) assert.ok(!text.includes(phrase), `禁止語「${phrase}」`);
  for (const word of ["職業", "適職", "向いている", "才能"]) assert.ok(!text.includes(word), word);
});
