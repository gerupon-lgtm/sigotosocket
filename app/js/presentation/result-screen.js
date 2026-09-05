import { el, formatDateTime } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { drawRadar, radarTextFallback } from "./radar-chart.js";
import { ScaleById } from "../data/scale-definitions.js";
import { composeResultText } from "../domain/result-composer.js";
import { hollandResultLines } from "../domain/holland.js";
import { uniqueInterest, lockPreview } from "../domain/cross-analysis.js";

function radarBlock(scaleScores) {
  const wrap = el("div", { class: "radar-wrap" });
  const canvas = el("canvas", { width: "340", height: "340",
    role: "img", "aria-label": `8領域のレーダーチャート。${radarTextFallback(scaleScores)}` });
  let drawn = false;
  try {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      drawRadar(ctx, scaleScores, { cx: 170, cy: 170, radius: 108 });
      drawn = true;
    }
  } catch {
    drawn = false;
  }
  // canvas が使えなくても数値で読める経路を必ず残す。
  wrap.appendChild(drawn ? canvas : el("p", { class: "notice", text: radarTextFallback(scaleScores) }));
  return wrap;
}

function scoreTable(scaleScores, rank) {
  const rows = (rank ?? scaleScores.map((s) => s.scaleId)).map((scaleId, i) => {
    const score = scaleScores.find((s) => s.scaleId === scaleId);
    return el("tr", {}, [
      el("td", { class: "num", text: rank ? String(i + 1) : "-" }),
      el("td", { text: ScaleById[scaleId].labelJa }),
      el("td", { class: "num", text: score.raw.toFixed(1) }),
    ]);
  });
  return el("table", { class: "scores" }, [
    el("thead", {}, [el("tr", {}, [
      el("th", { text: "順位" }), el("th", { text: "領域" }), el("th", { text: "点数" }),
    ])]),
    el("tbody", {}, rows),
  ]);
}

export function renderResultScreen({ snapshot, bigFive = null, onCard, onRestart, onHome, onAbout }) {
  const text = composeResultText({
    standardizable: snapshot.standardizable,
    rank: snapshot.rank,
    primaryTypeId: snapshot.primaryTypeId,
    alternativeTypeId: snapshot.alternativeTypeId,
  });

  const holland = hollandResultLines(snapshot.rank);
  // ③固有性（F-013）。連携していない・該当が無いときは null が返り、節ごと出ない。
  const unique = uniqueInterest({ rank: snapshot.rank, bigFive });
  // ロック予告（F-014）。連携済みなら null になり、上の本文と入れ替わる。
  const preview = lockPreview({ rank: snapshot.rank, bigFive });

  const observations = text.observations.map((entry) => el("div", { class: "observation" }, [
    el("p", { class: "observation-head", text: `${entry.position}：${entry.label}` }),
    el("p", { class: "observation-body", text: entry.text }),
  ]));

  return el("section", { class: "screen result" }, [
    appHeader({ screenLabel: "詳細結果" }),
    el("p", { class: "title-label", text: "あなたの称号" }),
    el("h1", { class: "type-name", text: text.title }),
    el("p", { class: "type-subtitle", text: text.subtitle }),
    el("p", { class: "meta", text: formatDateTime(snapshot.createdAt) }),
    radarBlock(snapshot.scaleScores),
    el("div", { class: "prose" }, text.reason.map((p) => el("p", { text: p }))),
    ...(observations.length > 0 ? [el("h2", { text: "回答から見えたこと" }), ...observations] : []),
    // 順位が無い（判定不能）ときは空配列が返り、節ごと出ない。
    ...(holland.length > 0
      ? [el("h2", { text: "ホランド型" }),
         el("div", { class: "prose holland" }, holland.map((line) => el("p", { text: line })))]
      : []),
    ...(unique
      ? [el("h2", { text: "性格からは予測できない興味" }),
         el("div", { class: "prose unique-interest" }, unique.lines.map((line) => el("p", { text: line })))]
      : []),
    ...(preview
      ? [el("h2", { text: "ビッグファイブと合わせると" }),
         el("div", { class: "prose lock-preview" }, preview.lines.map((line) => el("p", { text: line })))]
      : []),
    el("h2", { text: "8つの領域の点数" }),
    scoreTable(snapshot.scaleScores, snapshot.rank),
    el("div", { class: "actions" }, [
      el("button", { class: "primary", type: "button", onClick: onCard }, "カードを見る"),
      el("button", { class: "secondary", type: "button", onClick: onRestart }, "はじめから答え直す"),
      el("button", { class: "link", type: "button", onClick: onHome }, "トップへ戻る"),
    ]),
    el("div", { class: "disclaimer" }, [
      ...text.notes.map((note) => el("p", { text: note })),
      el("p", { text: "この診断は医学的・心理学的な検査ではありません。" }),
      el("button", { class: "link", type: "button", onClick: onAbout }, "出典・免責・データの扱い"),
    ]),
  ]);
}
