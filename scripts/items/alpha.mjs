import { readFileSync, writeFileSync } from "node:fs";
import { ItemMaster } from "../../app/js/data/item-master.js";
import { BIG_FIVE_FACTOR_ORDER } from "../../app/js/domain/big-five-link.js";
import { parseSampleCsv, buildSampleReport } from "./sample-report.mjs";

/**
 * 友人サンプルの実測（T-035）。processing-design §10-2・§10-3。
 *
 *   npm run sample:template > friends.csv   見出し行だけのCSVを作る
 *   npm run sample:check friends.csv        αと6ペアの符号を出す
 *
 * **判断はしない。**事実と但し書きを出すだけで、②層を出すか落とすかは人が決める。
 */

const COLUMNS = ["respondentId", ...BIG_FIVE_FACTOR_ORDER, ...ItemMaster.map((item) => item.id)];

if (process.argv.includes("--template")) {
  const out = process.argv[process.argv.indexOf("--template") + 1];
  const header = `${COLUMNS.join(",")}\n`;
  if (out && !out.startsWith("--")) {
    writeFileSync(out, header);
    console.log(`見出し行を書きました: ${out}`);
    console.log(`  1行1人。respondentId は好きな識別子（本名を入れないこと）。`);
    console.log(`  5因子（${BIG_FIVE_FACTOR_ORDER.length}列）は 1.00〜5.00 の内部平均。分からなければ空のままでよい（αだけに使う）。`);
    console.log(`  項目は45列すべて 1〜5 で埋める。1つでも空だとその行は落ちる。`);
  } else {
    process.stdout.write(header);
  }
  process.exit(0);
}

const path = process.argv[2];
if (!path) {
  console.error("使い方: npm run sample:check <回答CSV>");
  console.error("       npm run sample:template <出力先CSV>   （見出し行だけ作る）");
  process.exit(1);
}

const { respondents, problems } = parseSampleCsv(readFileSync(path, "utf8"));
for (const problem of problems) console.error(`  × ${problem}`);

if (respondents.length === 0) {
  console.error("使える回答がありません。");
  process.exit(1);
}

const report = buildSampleReport(respondents);
const show = (value) => (value === null ? "—" : value.toFixed(3));

console.log(`\n回答者 ${report.respondentCount}人（うちBig5とペア ${report.pairedCount}人）`);

console.log(`\n■ 尺度ごとのα（推定は全尺度 .72 以上）`);
for (const row of report.alpha) {
  const mark = row.alpha === null ? " " : row.alpha >= 0.72 ? "○" : "▲";
  console.log(`  ${mark} ${row.labelJa.padEnd(4, "　")} ${show(row.alpha)}  (${row.itemCount}項目)`);
}

console.log(`\n■ 6ペアの相関の符号（参照相関は原典の値。掛け合わせには使わない）`);
for (const pair of report.signCheck) {
  const mark = pair.verdict === "符号が再現" ? "○" : pair.verdict === "符号が逆" ? "×" : " ";
  console.log(`  ${mark} ${pair.factorId} ↔ ${pair.scaleId}`);
  console.log(`      r=${show(pair.r)} (n=${pair.n}) 参照 ${pair.reference.toFixed(2)} → ${pair.verdict}`);
}

console.log(`\n■ 読むときの注意`);
for (const caution of report.cautions) console.log(`  - ${caution}`);

if (!report.meetsSampleTarget) {
  console.log(`\n件数が §10-2 の目安（10〜20人）に届いていません。この結果だけで②層の採否を決めないこと。`);
}
