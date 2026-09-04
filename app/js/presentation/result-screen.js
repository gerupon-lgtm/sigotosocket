import { el, formatDateTime } from "./screen-helpers.js";
import { drawRadar, radarTextFallback } from "./radar-chart.js";
import { ScaleById } from "../data/scale-definitions.js";
import { composeResultText } from "../domain/result-composer.js";

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
      el("td", { class: "num", text: score.raw.toFixed(2) }),
    ]);
  });
  return el("table", { class: "scores" }, [
    el("thead", {}, [el("tr", {}, [
      el("th", { text: "順位" }), el("th", { text: "領域" }), el("th", { text: "素点" }),
    ])]),
    el("tbody", {}, rows),
  ]);
}

export function renderResultScreen({ snapshot, onCard, onRestart, onAbout }) {
  const text = composeResultText({
    standardizable: snapshot.standardizable,
    rank: snapshot.rank,
    primaryTypeId: snapshot.primaryTypeId,
    alternativeTypeId: snapshot.alternativeTypeId,
  });

  const head = [el("h1", { class: "type-name", text: text.headline })];
  if (text.alternativeHeadline) {
    head.push(el("p", { class: "alt-type", text: `または「${text.alternativeHeadline}」` }));
  }

  return el("section", { class: "screen result" }, [
    ...head,
    el("p", { class: "meta", text: formatDateTime(snapshot.createdAt) }),
    radarBlock(snapshot.scaleScores),
    el("div", { class: "prose" }, text.paragraphs.map((p) => el("p", { text: p }))),
    scoreTable(snapshot.scaleScores, snapshot.rank),
    el("div", { class: "actions" }, [
      el("button", { class: "primary", type: "button", onClick: onCard }, "カードを見る"),
      el("button", { class: "secondary", type: "button", onClick: onRestart }, "もう一度やる"),
    ]),
    el("p", { class: "disclaimer" }, [
      "この診断は医学的・心理学的な検査ではありません。ここでの高い・低いは、あなたの8領域どうしを比べた結果です。",
      el("br"),
      el("button", { class: "link", type: "button", onClick: onAbout }, "出典・免責・データの扱い"),
    ]),
  ]);
}
