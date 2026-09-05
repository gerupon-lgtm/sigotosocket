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

test("③が出ない人にも予告する（②が入ったので全員へ・v1.21）", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  const preview = lockPreview({ rank: ["analysis", "erudition"], bigFive: null });
  assert.ok(preview, "手仕事・挑戦が上位に無い人にも予告が要る");
  assert.deepEqual(preview.scaleIds, [], "③の対象が無いのに名指ししている");
  assert.ok(preview.lines.join("").includes("6つの組み合わせ"), "②の予告になっていない");
});

test("予告は件数も内容も約束しない（連携前は相手の5因子が無い）", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  const text = lockPreview({ rank: ["analysis", "erudition"], bigFive: null }).lines.join("");
  for (const word of ["1件", "2件", "必ず", "かならず"]) {
    assert.ok(!text.includes(word), `件数を約束している: ${word}`);
  }
});

test("予告に「判定」を使わない（出典・免責の文と衝突する）", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  for (const rank of [["production", "analysis"], ["analysis", "erudition"]]) {
    assert.ok(!lockPreview({ rank, bigFive: null }).lines.join("").includes("判定"),
      `${rank.join("/")}: 予告に「判定」が入っている`);
  }
});

test("③の予告と③の本文は同じ判定から出る（連携の前後で話が食い違わない）", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  for (const rank of [["production", "analysis"], ["analysis", "adventure"], ["analysis", "erudition"]]) {
    const promised = lockPreview({ rank, bigFive: null });
    const delivered = uniqueInterest({ rank, bigFive: LINK });
    assert.deepEqual(promised.scaleIds, delivered ? delivered.scaleIds : [],
      `${rank.join("/")}: ③の予告と本文が食い違う`);
  }
});

test("予告は禁止語を含まず、断定もしない", async () => {
  const { lockPreview } = await import("../js/domain/cross-analysis.js");
  const text = lockPreview({ rank: ["production", "adventure"], bigFive: null }).lines.join(" ");
  for (const phrase of FORBIDDEN_PHRASES) assert.ok(!text.includes(phrase), `禁止語「${phrase}」`);
  for (const word of ["職業", "適職", "向いている", "才能"]) assert.ok(!text.includes(word), word);
});

/* ---- ②整合／不整合（F-012・processing-design §8） ---- */

const {
  consistencyPairs, CONSISTENCY_MIN_Z, CONSISTENCY_MAX_ITEMS,
} = await import("../js/domain/cross-analysis.js");
const {
  CONSISTENCY_PAIRS, CONSISTENCY_PREAMBLE, CONSISTENCY_NONE, positionPhrase, echoPhrase,
} = await import("../js/domain/cross-analysis-text.js");
const { SCALE_ORDER } = await import("../js/data/scale-order.js");

/** 5因子の内部平均から連携を作る（順は intellect, conscient, extra, agree, emotional） */
function linkOf(...means) {
  const body = means.map((m) => String(Math.round(m * 100)).padStart(3, "0")).join("");
  return parseBigFiveCode(`v1-${body}`);
}
/** z を直に置いた尺度得点。**標準化の式は通さない**（判定の分岐だけを見るため） */
function scoresOf(byId) {
  return SCALE_ORDER.map((scaleId) => ({ scaleId, raw: 3, z: byId[scaleId] ?? 0 }));
}

test("対象は6ペアのみで、順序も参照相関も processing-design §8 の表どおり", () => {
  assert.deepEqual(
    CONSISTENCY_PAIRS.map((p) => [p.factorId, p.scaleId, p.r]),
    [
      ["intellectImagination", "creativity", 0.30],
      ["intellectImagination", "erudition", 0.34],
      ["intellectImagination", "leadership", 0.29],
      ["agreeableness", "altruism", 0.42],
      ["extraversion", "leadership", 0.38],
      ["conscientiousness", "organization", 0.20],
    ]);
  assert.equal(CONSISTENCY_MIN_Z, 0.3);
  assert.equal(CONSISTENCY_MAX_ITEMS, 2);
});

test("連携していなければ節ごと出ない", () => {
  assert.equal(consistencyPairs({ scaleScores: scoresOf({}), bigFive: null }), null);
});

test("ORVIS側が判定不能なら出ない（z が無い）", () => {
  const scores = SCALE_ORDER.map((scaleId) => ({ scaleId, raw: 3, z: null }));
  assert.equal(consistencyPairs({ scaleScores: scores, bigFive: LINK }), null);
});

test("5因子が全部同値なら出ない（z が無い）", () => {
  assert.equal(consistencyPairs({ scaleScores: scoresOf({}), bigFive: linkOf(3, 3, 3, 3, 3) }), null);
});

test("実例：協調性が高く支援が低い人には、そのペアが1件出る", () => {
  const scores = scoresOf({
    leadership: -0.01, organization: -1.20, altruism: -0.49, creativity: 1.53,
    analysis: 0.70, production: -1.44, adventure: -0.25, erudition: 1.17,
  });
  const result = consistencyPairs({ scaleScores: scores, bigFive: linkOf(3.0, 3.0, 3.0, 4.2, 1.8) });
  assert.equal(result.items.length, 1, "知性・想像力は z=0 なので落ちるはず");
  const [item] = result.items;
  assert.equal(item.factorId, "agreeableness");
  assert.equal(item.scaleId, "altruism");
  assert.equal(item.aligned, false);
  assert.ok(item.heading.includes("向きが分かれました"), item.heading);
  assert.ok(item.lines[0].includes("いちばん高く出ています"), item.lines[0]);
  assert.ok(item.lines[0].includes("r=.42"), "原典の強さを本文に書いていない");
  assert.equal(result.noneLines, null);
});

test("向きが揃えば、揃ったほうの文になる", () => {
  const scores = scoresOf({ altruism: 1.4, creativity: -1.2, production: -0.6 });
  const high = consistencyPairs({ scaleScores: scores, bigFive: linkOf(3.0, 3.0, 3.0, 4.5, 1.5) });
  const item = high.items.find((entry) => entry.scaleId === "altruism");
  assert.equal(item.aligned, true);
  assert.ok(item.heading.includes("向きが揃いました"), item.heading);
  assert.equal(item.lines[1], CONSISTENCY_PAIRS[3].text.alignedHigh);
});

test("両方低いときは、両方高いときと違う文を出す", () => {
  const scores = scoresOf({ altruism: -1.4, creativity: 1.2, production: 0.6 });
  const low = consistencyPairs({ scaleScores: scores, bigFive: linkOf(3.0, 3.0, 3.0, 1.5, 4.5) });
  const item = low.items.find((entry) => entry.scaleId === "altruism");
  assert.equal(item.aligned, true);
  assert.equal(item.lines[1], CONSISTENCY_PAIRS[3].text.alignedLow);
  assert.notEqual(CONSISTENCY_PAIRS[3].text.alignedLow, CONSISTENCY_PAIRS[3].text.alignedHigh);
});

test("|z| が 0.3 未満のペアは落とす", () => {
  // 支援だけ 0.2（本人の中で真ん中あたり）。協調性は高い
  const scores = scoresOf({ altruism: 0.2, creativity: 1.5, erudition: -1.4 });
  const result = consistencyPairs({ scaleScores: scores, bigFive: linkOf(4.5, 3.0, 3.0, 4.0, 1.5) });
  assert.ok(!result.items.some((entry) => entry.scaleId === "altruism"), "真ん中あたりを拾っている");
});

test("同じ因子は1回まで（知性・想像力は3ペアに出てくる）", () => {
  const scores = scoresOf({ creativity: 1.5, erudition: 1.2, altruism: 1.0, production: -1.5 });
  const result = consistencyPairs({ scaleScores: scores, bigFive: linkOf(4.5, 3.0, 3.0, 4.0, 1.5) });
  assert.deepEqual(result.items.map((entry) => entry.scaleId), ["creativity", "altruism"]);
});

test("同じ尺度は1回まで（統率は2ペアに出てくる）", () => {
  const scores = scoresOf({ leadership: 1.5, creativity: 0.1, erudition: -0.1, production: -1.5 });
  const result = consistencyPairs({ scaleScores: scores, bigFive: linkOf(4.4, 3.0, 4.2, 3.0, 1.4) });
  assert.equal(result.items.filter((entry) => entry.scaleId === "leadership").length, 1);
});

test("最大2件", () => {
  const scores = scoresOf({
    creativity: 1.5, erudition: 1.4, leadership: 1.3, altruism: 1.2, organization: 1.1, production: -1.5,
  });
  const result = consistencyPairs({ scaleScores: scores, bigFive: linkOf(4.5, 4.4, 4.3, 4.2, 1.0) });
  assert.equal(result.items.length, CONSISTENCY_MAX_ITEMS);
});

test("6ペアすべてが落ちても、結果として1件出す（変更禁止事項4）", () => {
  const scores = scoresOf({
    leadership: 0.1, organization: -0.1, altruism: 0.05, creativity: 0.2, erudition: -0.2,
    analysis: 1.5, production: -1.6, adventure: 0.05,
  });
  const result = consistencyPairs({ scaleScores: scores, bigFive: linkOf(4.5, 4.4, 4.3, 4.2, 1.0) });
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.noneLines, CONSISTENCY_NONE);
});

test("同じ入力なら同じ出力（実行ごとに変わらない）", () => {
  const scores = scoresOf({ creativity: 1.2, erudition: 1.2, altruism: 1.2, production: -1.5 });
  const link = linkOf(4.5, 3.0, 3.0, 4.5, 1.0);
  const a = consistencyPairs({ scaleScores: scores, bigFive: link });
  const b = consistencyPairs({ scaleScores: scores, bigFive: link });
  assert.deepEqual(a.items.map((x) => [x.factorId, x.scaleId]),
    b.items.map((x) => [x.factorId, x.scaleId]));
});

test("前書きは原典の限界と、翻訳を確かめていないことを必ず言う（§10-2の置き換え）", () => {
  const text = CONSISTENCY_PREAMBLE.join("");
  assert.ok(text.includes("英語の原版"), "原典が英語であることを言っていない");
  assert.ok(text.includes("確かめていません"), "翻訳を検証していないことを言っていない");
  assert.ok(text.includes("あなたが決めてください"), "推論を読み手に返していない");
});

test("定型文は6ペア×3本ぶんそろっていて、すべて断定を避ける語で終わる", () => {
  const endings = ["かもしれません。", "ようです。", "と読めます。", "という読み方ができます。"];
  let count = 0;
  for (const pair of CONSISTENCY_PAIRS) {
    for (const key of ["alignedHigh", "alignedLow", "crossed"]) {
      const line = pair.text[key];
      assert.ok(typeof line === "string" && line.length > 0, `${pair.factorId}/${key} が無い`);
      assert.ok(endings.some((end) => line.endsWith(end)), `断定している: ${line}`);
      count += 1;
    }
  }
  assert.equal(count, 18);
});

test("②の文言はどこにも禁止語を含まない", () => {
  const all = [
    ...CONSISTENCY_PREAMBLE, ...CONSISTENCY_NONE,
    ...CONSISTENCY_PAIRS.flatMap((p) => [p.note, p.text.alignedHigh, p.text.alignedLow, p.text.crossed]),
  ].join(" ");
  for (const phrase of FORBIDDEN_PHRASES) assert.ok(!all.includes(phrase), `禁止語「${phrase}」`);
  for (const word of ["一般に", "べき", "向いています", "適職", "判定"]) {
    assert.ok(!all.includes(word), `使わない語「${word}」`);
  }
});

test("位置づけの語は本人の中の順位だけで決まる（変更禁止事項2）", () => {
  assert.equal(positionPhrase(1, 5), "いちばん高く出ています");
  assert.equal(positionPhrase(5, 5), "いちばん低く出ています");
  assert.equal(positionPhrase(2, 5), "高いほうです");
  assert.equal(positionPhrase(4, 5), "低いほうです");
  assert.equal(positionPhrase(1, 8), "いちばん高く出ています");
  assert.equal(positionPhrase(8, 8), "いちばん低く出ています");
});

test("揃っていて位置づけの語まで同じなら、2文目を言い換える", () => {
  const scores = scoresOf({ altruism: 1.5, creativity: -1.3, production: -0.4 });
  const item = consistencyPairs({ scaleScores: scores, bigFive: linkOf(3.0, 3.0, 3.0, 4.6, 1.4) })
    .items.find((entry) => entry.scaleId === "altruism");
  assert.equal(item.aligned, true);
  assert.ok(item.lines[0].includes("同じくいちばん上に来ています"), item.lines[0]);
  assert.equal((item.lines[0].match(/いちばん高く出ています/g) ?? []).length, 1,
    `同じ語を2回繰り返している: ${item.lines[0]}`);
});

test("言い換えは4通りすべてに用意がある", () => {
  assert.equal(echoPhrase("いちばん高く出ています"), "同じくいちばん上に来ています");
  assert.equal(echoPhrase("いちばん低く出ています"), "同じくいちばん下に来ています");
  assert.equal(echoPhrase("高いほうです"), "同じく高いほうです");
  assert.equal(echoPhrase("低いほうです"), "同じく低いほうです");
  for (const [position, total] of [[1, 5], [2, 5], [4, 5], [5, 5], [1, 8], [8, 8]]) {
    const phrase = positionPhrase(position, total);
    assert.notEqual(echoPhrase(phrase), phrase, `言い換えが無い: ${phrase}`);
  }
});
