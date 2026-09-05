import test from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.js";

installDom();

const { renderStartScreen } = await import("../js/presentation/start-screen.js");
const { renderQuestionnaireScreen } = await import("../js/presentation/questionnaire-screen.js");
const { renderResultScreen } = await import("../js/presentation/result-screen.js");
const { renderAboutScreen } = await import("../js/presentation/about-screen.js");
const { createResponseState, withAnswer } = await import("../js/domain/response-state.js");
const { ItemMaster } = await import("../js/data/item-master.js");
const { scoreScales } = await import("../js/domain/scoring.js");
const { standardize } = await import("../js/domain/standardize.js");
const { classify } = await import("../js/domain/type-classifier.js");
const { createResultSnapshot } = await import("../js/domain/result-snapshot.js");
const { STORAGE_STATUS } = await import("../js/infrastructure/progress-storage.js");
const { uniformAnswers, answersWith, answersByScale } = await import("./helpers.js");

function snapshotFor(answers) {
  const standardized = standardize(scoreScales({ items: ItemMaster, answers }));
  return createResultSnapshot({ standardized, classification: classify(standardized) });
}

test("トップは所要時間と設問数を出し、保存データがなければ「続きから」を出さない", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const text = node.textContent;
  assert.ok(text.includes("45問"));
  assert.ok(text.includes("5分"));
  assert.ok(!text.includes("続きから"));
});

test("途中まで回答していれば「続きから」が出る", () => {
  const state = withAnswer(createResponseState(null), ItemMaster[0].id, 4);
  const node = renderStartScreen({
    progressState: state, latestResult: null, storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  assert.ok(node.textContent.includes("続きから（1 / 45問）"));
});

test("保存できない環境では通知を出す", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.UNAVAILABLE,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  assert.ok(node.textContent.includes("保存できない"));
});

test("設問は1問1画面。1問目では戻るが無効", () => {
  const node = renderQuestionnaireScreen({
    state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit() {},
  });
  assert.ok(node.textContent.includes("1 / 45問"));
  assert.ok(node.textContent.includes(ItemMaster[0].textJa));
  const back = node.querySelectorAll(".secondary")[0];
  assert.equal(back.getAttribute("disabled"), "");
  assert.equal(node.querySelectorAll(".choice").length, 5);
});

test("選択肢を押すと itemId と値が渡る", () => {
  let received = null;
  const node = renderQuestionnaireScreen({
    state: createResponseState(null),
    onAnswer(id, value) { received = [id, value]; },
    onBack() {}, onQuit() {},
  });
  node.querySelectorAll(".choice")[4].click();
  assert.deepEqual(received, [ItemMaster[0].id, 5]);
});

test("結果画面はタイプ名・数値・免責を出す", () => {
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const node = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} });
  const text = node.textContent;
  assert.ok(text.includes("医学的・心理学的な検査ではありません"));
  assert.ok(text.includes("ほかの人と比べた結果ではありません"));
  assert.ok(node.querySelectorAll("tbody")[0].children.length === 8);
});

test("判定不能でも結果画面が壊れず、カードへ進める", () => {
  const snapshot = snapshotFor(uniformAnswers(3));
  assert.equal(snapshot.standardizable, false);
  const node = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} });
  assert.ok(node.textContent.includes("称号を決められませんでした"));
  assert.ok(node.textContent.includes("カードを見る"));
});

test("結果画面はホランド型を出す（F-024）", () => {
  const snapshot = snapshotFor(answersByScale({ leadership: 5, analysis: 4 }));
  assert.equal(snapshot.rank[0], "leadership");
  const node = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} });
  const text = node.textContent;
  assert.ok(text.includes("企業的（Enterprising）"), "1位の型名が出ていない");
  assert.ok(text.includes("調べてみてください"), "調べる手がかりの案内が出ていない");
});

test("言葉が1位なら、結果画面は6類型の外だと伝え、2位の型を参考に添える", () => {
  const snapshot = snapshotFor(answersByScale({ erudition: 5, analysis: 4 }));
  assert.equal(snapshot.rank[0], "erudition");
  assert.equal(snapshot.rank[1], "analysis");
  const text = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} }).textContent;
  assert.ok(text.includes("6類型の外にある"), "型を持たない領域である旨が出ていない");
  assert.ok(text.includes("（参考）次に高かった「探究」は「研究的（Investigative）」"));
  assert.ok(!text.includes("対応なし"), "「対応なし」とは書かない");
});

test("判定不能ならホランド型の節を出さない", () => {
  const snapshot = snapshotFor(uniformAnswers(3));
  assert.equal(snapshot.rank, null);
  const text = renderResultScreen({ snapshot, onCard() {}, onRestart() {}, onAbout() {} }).textContent;
  assert.ok(!text.includes("ホランド"), "順位が無いのにホランド型が出ている");
});

test("連携済みで手仕事・挑戦が上位なら、結果画面に固有の興味が出る（F-013）", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  assert.deepEqual(snapshot.rank.slice(0, 2), ["production", "adventure"]);
  const node = renderResultScreen({
    snapshot, bigFive: parseBigFiveCode("v1-342288401195267"),
    onCard() {}, onRestart() {}, onAbout() {},
  });
  const text = node.textContent;
  assert.ok(text.includes("手仕事") && text.includes("挑戦"));
  assert.ok(text.includes("予測できるものではありません"), "③の根拠が出ていない");
});

test("連携していなければ固有の興味は出さない", () => {
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: null, onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(!text.includes("予測できるものではありません"),
    "連携していないのに固有の興味を出している");
});

test("連携済みでも対象の領域が上位でなければ出さない", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const snapshot = snapshotFor(answersByScale({ analysis: 5, erudition: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: parseBigFiveCode("v1-342288401195267"),
    onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(!text.includes("予測できるものではありません"));
});

test("未連携で対象が上位なら、連携の予告を出す（F-014）", () => {
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: null, onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(text.includes("連携すると"), "予告が出ていない");
  assert.ok(text.includes("手仕事"), "本人の領域名が入っていない");
});

test("連携済みなら予告は消え、本文に入れ替わる", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const text = renderResultScreen({
    snapshot, bigFive: parseBigFiveCode("v1-342288401195267"),
    onCard() {}, onRestart() {}, onAbout() {},
  }).textContent;
  assert.ok(!text.includes("連携すると"), "連携済みなのに予告が残っている");
  assert.ok(text.includes("予測できるものではありません"), "本文が出ていない");
});

test("全画面にヘッダーがあり、見出しは本文側が持つ（ココロパレア踏襲）", () => {
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const screens = [
    ["INTEREST CHECK", renderStartScreen({
      progressState: createResponseState(null), latestResult: null,
      storageStatus: STORAGE_STATUS.OK,
      onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
    })],
    [null, renderQuestionnaireScreen({
      state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit() {},
    })],
    ["DETAIL RESULT", renderResultScreen({
      snapshot, bigFive: null, onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
    })],
    ["ABOUT", renderAboutScreen({ onBack() {}, onClearAll() {} })],
  ];
  for (const [kicker, node] of screens) {
    const header = node.querySelectorAll(".app-header")[0];
    assert.ok(header, "ヘッダーが無い");
    assert.equal(header.querySelectorAll(".app-mark").length, 1, "アイコンが無い");
    assert.equal(header.querySelectorAll(".app-brand-name")[0].textContent, "シゴトソケット");
    assert.equal(header.querySelectorAll(".app-screen-label").length, 0, "画面名をヘッダーに置いている");
    const kickers = node.querySelectorAll(".screen-kicker");
    if (kicker) assert.equal(kickers[0].textContent, kicker);
    else assert.equal(kickers.length, 0, "設問画面にキッカーは置かない");
  }
});

test("設問画面のヘッダーは sticky で、中断してトップへを持つ", () => {
  let quit = 0;
  const node = renderQuestionnaireScreen({
    state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit: () => { quit += 1; },
  });
  const header = node.querySelectorAll(".app-header")[0];
  assert.ok(header.className.includes("is-sticky"), "設問画面のヘッダーが sticky でない");
  const action = header.querySelectorAll(".app-header-action")[0];
  assert.equal(action.textContent, "中断してトップへ");
  action.click();
  assert.equal(quit, 1);
});

test("結果画面にトップへ戻るがある（ココロパレアと同じ導線）", () => {
  let home = 0;
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const node = renderResultScreen({
    snapshot, bigFive: null,
    onCard() {}, onRestart() {}, onHome: () => { home += 1; }, onAbout() {},
  });
  const back = [...node.querySelectorAll("button")].find((b) => b.textContent === "トップへ戻る");
  assert.ok(back, "トップへ戻るが無い");
  back.click();
  assert.equal(home, 1);
});

test("トップの本文は白いパネルに載る（ココロパレア踏襲）", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const panel = node.querySelectorAll(".panel")[0];
  assert.ok(panel, "パネルが無い");
  assert.ok(panel.querySelectorAll(".screen-kicker").length === 1, "見出しがパネルの中にない");
  assert.ok(panel.textContent.includes("はじめる"));
});

test("ツール説明のパネルは閉じた状態で置く", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const intro = node.querySelectorAll(".tool-intro")[0];
  assert.ok(intro, "説明パネルが無い");
  assert.equal(intro.tagName, "DETAILS");
  assert.equal(intro.getAttribute("open"), null, "既定で開いている");
  assert.equal(intro.querySelectorAll("summary").length, 1);
});

test("説明パネルは3つの話題を持つ（ツール・連携・むっくん）", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const text = node.querySelectorAll(".tool-intro")[0].textContent;
  assert.ok(text.includes("ORVIS"), "ツールの説明が無い");
  assert.ok(text.includes("ココロパレア"), "連携の説明が無い");
  assert.ok(text.includes("むっくん"), "キャラクターの紹介が無い");
  assert.ok(text.includes("ビッグファイブ"), "連携相手が何かの説明が無い");
});

test("説明パネルは禁止語を含まず、職業も示さない", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const text = node.querySelectorAll(".tool-intro")[0].textContent;
  for (const phrase of ["平均より", "人より", "多数派", "少数派", "苦手", "向いていない"]) {
    assert.ok(!text.includes(phrase), `禁止語「${phrase}」`);
  }
  for (const word of ["適職", "向いている職業", "天職"]) {
    assert.ok(!text.includes(word), `「${word}」が含まれる`);
  }
});

test("説明パネルからココロパレアへ行ける", async () => {
  const { appMeta } = await import("../js/config/app-meta.js");
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const links = [...node.querySelectorAll("a")].filter((a) =>
    a.getAttribute("href") === appMeta.brand.siblingUrl);
  assert.ok(links.length >= 1, "ココロパレアへのリンクが無い");
  for (const link of links) {
    assert.equal(link.getAttribute("target"), null, "連携フローで別タブを開いている");
    assert.equal(link.getAttribute("rel"), "noreferrer");
    assert.ok(link.textContent.includes("ココロパレア"));
  }
});

test("トップは既存説明を残し、連携方法を独立した閉じたパネルで案内する", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  assert.equal(node.querySelectorAll(".tool-intro").length, 1, "既存説明を消している");
  const guide = node.querySelectorAll(".linkage-guide")[0];
  assert.ok(guide, "独立した連携方法が無い");
  assert.equal(guide.tagName, "DETAILS");
  assert.equal(guide.getAttribute("open"), null, "既定で開いている");
  assert.ok(guide.textContent.includes("それぞれ単独で利用できます"));
  assert.ok(guide.textContent.includes("50問の詳細結果"));
  assert.ok(guide.textContent.includes("詳細結果画面の「シゴトソケットへ結果を渡す」"));
  assert.ok(guide.textContent.includes("履歴一覧の「シゴトソケットへ渡す」"));
  assert.ok(!guide.textContent.includes("この結果をシゴトソケットへ渡す"));
  assert.ok(guide.textContent.includes("まだ無い場合は45問を終えた後"));
  assert.ok(guide.textContent.includes("最後に渡した結果だけ"));
});

test("未連携の結果画面にも閉じた連携方法を表示する", () => {
  const snapshot = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const node = renderResultScreen({
    snapshot, bigFive: null, onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
  });
  const guide = node.querySelectorAll(".linkage-guide")[0];
  assert.ok(guide, "結果画面に連携方法が無い");
  assert.equal(guide.getAttribute("open"), null);
  assert.ok(guide.textContent.includes("ココロパレアへ進む"));
});

test("受取直後は結果が無くても完了と45問後の反映を知らせる", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    linkageReceipt: { kind: "received", hasResult: false },
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const receipt = node.querySelectorAll(".linkage-receipt")[0];
  assert.ok(receipt, "受取完了が表示されない");
  assert.ok(receipt.textContent.includes("ココロパレアの結果を受け取りました"));
  assert.ok(receipt.textContent.includes("45問を終えると"));
  assert.ok(node.textContent.includes("45問を始める"));
});

test("再連携では置換を明示し、既存結果への入口を組み合わせ結果として示す", () => {
  const snapshot = snapshotFor(answersWith((_, i) => (i % 5) + 1));
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: snapshot,
    storageStatus: STORAGE_STATUS.OK,
    linkageReceipt: { kind: "updated", hasResult: true },
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  const receipt = node.querySelectorAll(".linkage-receipt")[0];
  assert.ok(receipt.textContent.includes("ココロパレアの結果を更新しました"));
  assert.ok(receipt.textContent.includes("以前の連携情報"));
  assert.ok(receipt.textContent.includes("置き換えました"));
  assert.ok(node.textContent.includes("組み合わせた結果を見る"));
});

test("出典・免責画面に同梱フォントの出典がある（SIL OFL 1.1）", () => {
  const text = renderAboutScreen({ onBack() {}, onClearAll() {} }).textContent;
  assert.ok(text.includes("Noto Serif JP"), "元フォント名が無い");
  assert.ok(text.includes("SIL Open Font License"), "許諾の名前が無い");
});

test("出典・免責画面に出典とデータ削除がある", () => {
  const node = renderAboutScreen({ onBack() {}, onClearAll() {} });
  const text = node.textContent;
  assert.ok(text.includes("ORVIS"));
  assert.ok(text.includes("パブリックドメイン"));
  assert.ok(text.includes("削除"));
});

test("結果画面の③は、結果に紐づいた連携を見る（カードと同じ出どころ）", async () => {
  const { parseBigFiveCode } = await import("../js/domain/big-five-link.js");
  const { attachBigFive } = await import("../js/domain/result-snapshot.js");
  const base = snapshotFor(answersByScale({ production: 5, adventure: 4 }));
  const linked = attachBigFive(base, parseBigFiveCode("v1-342288401195267"));

  // 画面へ渡すのは snapshot.bigFive。main.js もそこから取る
  const withLink = renderResultScreen({
    snapshot: linked, bigFive: linked.bigFive,
    onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
  }).textContent;
  assert.ok(withLink.includes("予測できるものではありません"));

  const without = renderResultScreen({
    snapshot: base, bigFive: base.bigFive,
    onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
  }).textContent;
  assert.ok(!without.includes("予測できるものではありません"));
});

test("トップの見出しは「やってみたいことを知る」（2026-09-05 本人決定）", () => {
  const node = renderStartScreen({
    progressState: createResponseState(null), latestResult: null,
    storageStatus: STORAGE_STATUS.OK,
    onStart() {}, onResume() {}, onShowResult() {}, onAbout() {},
  });
  assert.equal(node.querySelectorAll(".screen-title")[0].textContent, "やってみたいことを知る");
});

test("結果画面にキャラクターが出る（ココロパレア踏襲・F-019）", () => {
  const snapshot = snapshotFor(answersByScale({ altruism: 5, creativity: 4 }));
  const node = renderResultScreen({
    snapshot, bigFive: null, onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
  });
  const figure = node.querySelectorAll(".character-figure")[0];
  assert.ok(figure, "結果画面にキャラクターが無い");
  assert.equal(figure.querySelectorAll(".character-pose").length, 1, "ポーズが無い");
  assert.equal(figure.querySelectorAll(".character-prop").length, 1, "小物が無い");
});

test("判定不能でも結果画面のキャラクターは出る", () => {
  const node = renderResultScreen({
    snapshot: snapshotFor(uniformAnswers(3)), bigFive: null,
    onCard() {}, onRestart() {}, onHome() {}, onAbout() {},
  });
  assert.equal(node.querySelectorAll(".character-figure").length, 1);
});

/* ---- CSP と style（2026-09-05・プログレスバーが動かなかった件） ---- */

test("プログレスバーの幅は設問が進むと伸びる", async () => {
  const { el } = await import("../js/presentation/screen-helpers.js");
  void el;   // 同じDOMスタブを共有していることの確認
  const widthAt = (index) => {
    let state = createResponseState(null);
    for (let i = 0; i < index; i += 1) state = { ...state, currentIndex: i + 1 };
    const node = renderQuestionnaireScreen({
      state, onAnswer() {}, onBack() {}, onQuit() {},
    });
    return node.querySelectorAll(".progress-bar")[0].style.width;
  };
  const first = Number.parseFloat(widthAt(0));
  const middle = Number.parseFloat(widthAt(22));
  const last = Number.parseFloat(widthAt(44));
  assert.ok(first > 0, `1問目で幅が無い: ${first}`);
  assert.ok(middle > first, `22問目で伸びていない: ${first} → ${middle}`);
  assert.equal(last, 100, `45問目で100%にならない: ${last}`);
});

test("幅は style プロパティに入る（style属性はCSPで無視される）", () => {
  const node = renderQuestionnaireScreen({
    state: createResponseState(null), onAnswer() {}, onBack() {}, onQuit() {},
  });
  const bar = node.querySelectorAll(".progress-bar")[0];
  assert.equal(bar.getAttribute("style"), null, "style属性に書くとCSPで効かない");
  assert.ok(bar.style.width, "style プロパティに入っていない");
});

test("el に style を文字列で渡したら落ちる（黙って無視されるのを防ぐ）", async () => {
  const { el } = await import("../js/presentation/screen-helpers.js");
  assert.throws(() => el("div", { style: "width:50%" }), /STYLE_MUST_BE_OBJECT_CSP/);
  assert.doesNotThrow(() => el("div", { style: { width: "50%" } }));
});

test("画面のソースに style 属性を組み立てる書き方が残っていない", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const dir = new URL("../js/presentation/", import.meta.url);
  for (const entry of await readdir(dir)) {
    if (!entry.endsWith(".js")) continue;
    // 規則そのものを実装している側。禁止する書き方を注釈で引用している
    if (entry === "screen-helpers.js") continue;
    const source = await readFile(new URL(entry, dir), "utf8");
    assert.ok(!/setAttribute\(\s*["']style["']/.test(source),
      `${entry}: setAttribute("style", ...) はCSPで無視される`);
    assert.ok(!/style:\s*[`"']/.test(source),
      `${entry}: style を文字列で渡している。オブジェクトで渡すこと`);
  }
});
