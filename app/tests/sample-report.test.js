import test from "node:test";
import assert from "node:assert/strict";
import { parseSampleCsv, buildSampleReport, SIGN_CHECK_PAIRS } from "../../scripts/items/sample-report.mjs";
import { ItemMaster } from "../js/data/item-master.js";

const BIG5 = ["intellectImagination", "conscientiousness", "extraversion", "agreeableness", "emotionalStability"];

/** 回答者1人分の行を作る。ORVIS は尺度ごとに値を決める。 */
/** big5 を渡すときは5因子すべてを埋める。1つでも欠けた行は「ペアなし」として扱われる。 */
function row(id, byScale, big5) {
  const cells = { respondentId: id };
  if (big5) for (const factor of BIG5) cells[factor] = big5[factor] ?? 3;
  for (const item of ItemMaster) cells[item.id] = byScale[item.scaleId] ?? 3;
  return cells;
}

function toCsv(rows) {
  const columns = ["respondentId", ...BIG5, ...ItemMaster.map((i) => i.id)];
  const line = (cells) => columns.map((c) => (cells[c] ?? "")).join(",");
  return [columns.join(","), ...rows.map(line)].join("\n");
}

test("符号を確かめるのは §8 の6ペアだけ（変更禁止事項3）", () => {
  assert.equal(SIGN_CHECK_PAIRS.length, 6);
  assert.deepEqual(SIGN_CHECK_PAIRS.map((p) => `${p.factorId}/${p.scaleId}`).sort(), [
    "agreeableness/altruism",
    "conscientiousness/organization",
    "extraversion/leadership",
    "intellectImagination/creativity",
    "intellectImagination/erudition",
    "intellectImagination/leadership",
  ]);
});

test("CSVから回答者を読み、尺度ごとの平均を出す", () => {
  const csv = toCsv([row("a", { analysis: 5, altruism: 1 }, { agreeableness: 2.0 })]);  // 他の4因子は3
  const { respondents, problems } = parseSampleCsv(csv);
  assert.deepEqual(problems, []);
  assert.equal(respondents.length, 1);
  assert.equal(respondents[0].scaleMeans.analysis, 5);
  assert.equal(respondents[0].scaleMeans.altruism, 1);
  assert.equal(respondents[0].bigFive.agreeableness, 2.0);
});

test("Big5の列が空でも読める（αだけに使う）", () => {
  const { respondents, problems } = parseSampleCsv(toCsv([row("a", { analysis: 4 })]));
  assert.deepEqual(problems, []);
  assert.equal(respondents[0].bigFive, null);
});

test("Big5が1つでも欠けた行はペアに数えない（ペアごとにnが変わるのを防ぐ）", () => {
  const lines = toCsv([row("a", { analysis: 4 }, { agreeableness: 2 })]).split("\n");
  const cells = lines[1].split(",");
  cells[1] = "";   // intellectImagination だけ空にする
  const { respondents } = parseSampleCsv([lines[0], cells.join(",")].join("\n"));
  assert.equal(respondents[0].bigFive, null, "部分的に埋まった行を使ってしまっている");
});

test("値域外・欠損・列不足は行ごとに問題として報告し、他の行は活かす", () => {
  const good = row("a", { analysis: 4 });
  const bad = row("b", { analysis: 4 });
  bad[ItemMaster[0].id] = 9;            // 1〜5の外
  const missing = row("c", { analysis: 4 });
  missing[ItemMaster[1].id] = "";       // 欠損
  const { respondents, problems } = parseSampleCsv(toCsv([good, bad, missing]));
  assert.equal(respondents.length, 1, "使える行だけ残す");
  assert.equal(problems.length, 2);
  assert.ok(problems.join(" ").includes("b"));
  assert.ok(problems.join(" ").includes("c"));
});

test("αを尺度ごとに出し、件数が少ないことを隠さない", () => {
  const rows = [];
  for (let i = 0; i < 4; i += 1) {
    rows.push(row(`r${i}`, { analysis: (i % 5) + 1, altruism: ((i + 2) % 5) + 1, leadership: (i % 4) + 1 }));
  }
  const report = buildSampleReport(parseSampleCsv(toCsv(rows)).respondents);
  assert.equal(report.respondentCount, 4);
  assert.equal(report.alpha.length, 8, "8尺度すべてに行がある");
  assert.ok(report.cautions.some((c) => c.includes("4")), `件数の但し書きが無い: ${report.cautions}`);
  assert.equal(report.meetsSampleTarget, false, "n=4 で目標達成にしない");
});

test("Big5が揃った回答者が2人未満なら符号は判定しない", () => {
  const rows = [row("a", { analysis: 4 }, { agreeableness: 2 }), row("b", { analysis: 2 })];  // bはBig5なし
  const report = buildSampleReport(parseSampleCsv(toCsv(rows)).respondents);
  assert.equal(report.pairedCount, 1);
  for (const pair of report.signCheck) {
    assert.equal(pair.r, null);
    assert.equal(pair.verdict, "判定不能");
  }
});

test("符号が期待どおりか／逆かを言い分ける", () => {
  // 協調性が高い人ほど支援も高い、を作る
  const rows = [1, 2, 3, 4, 5].map((v, i) =>
    row(`r${i}`, { altruism: v, analysis: 3 }, { agreeableness: v, conscientiousness: 3,
      extraversion: 3, intellectImagination: 3, emotionalStability: 3 }));
  const report = buildSampleReport(parseSampleCsv(toCsv(rows)).respondents);
  const pair = report.signCheck.find((p) => p.scaleId === "altruism");
  assert.ok(pair.r > 0.99, `r=${pair.r}`);
  assert.equal(pair.verdict, "符号が再現");

  const reversed = [1, 2, 3, 4, 5].map((v, i) =>
    row(`r${i}`, { altruism: 6 - v, analysis: 3 }, { agreeableness: v, conscientiousness: 3,
      extraversion: 3, intellectImagination: 3, emotionalStability: 3 }));
  const back = buildSampleReport(parseSampleCsv(toCsv(reversed)).respondents);
  assert.equal(back.signCheck.find((p) => p.scaleId === "altruism").verdict, "符号が逆");
});

test("③が依拠する手仕事・挑戦のαが低いときは、名指しで注意を出す", () => {
  // 手仕事と挑戦だけ回答をばらけさせ、まとまりを壊す
  const rows = [];
  for (let i = 0; i < 6; i += 1) {
    const cells = { respondentId: `r${i}` };
    for (const item of ItemMaster) {
      cells[item.id] = item.scaleId === "production" || item.scaleId === "adventure"
        ? ((i * 7 + item.sourceItemId * 3) % 5) + 1   // ばらばら
        : (i % 5) + 1;                                 // 尺度内でそろう
    }
    rows.push(cells);
  }
  const report = buildSampleReport(parseSampleCsv(toCsv(rows)).respondents);
  const named = report.cautions.find((c) =>
    c.includes("手仕事") && c.includes("挑戦") && c.includes("③"));
  assert.ok(named, `③層への影響を名指しした注意が無い: ${JSON.stringify(report.cautions)}`);
});
