import { el, formatDateTime } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { screenHeading } from "./screen-heading.js";
import { drawRadar, radarTextFallback } from "./radar-chart.js";
import { ScaleById } from "../data/scale-definitions.js";
import { composeResultText } from "../domain/result-composer.js";
import { hollandResultLines } from "../domain/holland.js";
import { uniqueInterest, lockPreview, consistencyPairs } from "../domain/cross-analysis.js";

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
  // ②整合／不整合（F-012）。連携していれば必ず何か返る（該当なしも正式な結果）。
  const consistency = consistencyPairs({ scaleScores: snapshot.scaleScores, bigFive });
  // ③固有性（F-013）。連携していない・該当が無いときは null が返り、見出しごと出ない。
  const unique = uniqueInterest({ rank: snapshot.rank, bigFive });
  // ロック予告（F-014）。連携済みなら null になり、上の本文と入れ替わる。
  const preview = lockPreview({ rank: snapshot.rank, bigFive });

  // 45問だけで言えることを全部言い終えてから、連携の話に移る。**②と③を1つの節にまとめる**：
  // ばらばらに置くと「連携して何が増えたのか」が読み手に見えない（要件定義書 v1.21）。
  const linkage = [];
  if (consistency) {
    linkage.push(el("h2", { text: "ココロパレアと合わせて見えたこと" }));
    linkage.push(el("div", { class: "prose linkage-preamble" },
      consistency.preamble.map((line) => el("p", { text: line }))));
    if (consistency.noneLines) {
      linkage.push(el("div", { class: "prose consistency-none" },
        consistency.noneLines.map((line) => el("p", { text: line }))));
    } else {
      for (const item of consistency.items) {
        linkage.push(el("div", { class: "consistency-item" }, [
          el("h3", { class: "consistency-head", text: item.heading }),
          ...item.lines.map((line) => el("p", { class: "consistency-body", text: line })),
        ]));
      }
    }
    if (unique) {
      linkage.push(el("h3", { class: "consistency-head", text: "性格からは予測できない興味" }));
      linkage.push(el("div", { class: "prose unique-interest" },
        unique.lines.map((line) => el("p", { text: line }))));
    }
  } else if (preview) {
    linkage.push(el("h2", { text: "ココロパレアの結果と合わせると" }));
    linkage.push(el("div", { class: "prose lock-preview" },
      preview.lines.map((line) => el("p", { text: line }))));
  }

  const observations = text.observations.map((entry) => el("div", { class: "observation" }, [
    el("p", { class: "observation-head", text: `${entry.position}：${entry.label}` }),
    el("p", { class: "observation-body", text: entry.text }),
  ]));

  return el("section", { class: "screen result" }, [
    appHeader({ action: { label: "トップへ戻る", onClick: onHome } }),
    screenHeading({ kicker: "DETAIL RESULT", title: "45問の詳細結果" }),
    el("div", { class: "panel" }, [
      el("p", { class: "title-label", text: "あなたの称号" }),
      el("h2", { class: "type-name", text: text.title }),
      el("p", { class: "type-subtitle", text: text.subtitle }),
      el("p", { class: "meta", text: formatDateTime(snapshot.createdAt) }),
      radarBlock(snapshot.scaleScores),
    ]),
    el("div", { class: "prose" }, text.reason.map((p) => el("p", { text: p }))),
    ...(observations.length > 0 ? [el("h2", { text: "回答から見えたこと" }), ...observations] : []),
    // 順位が無い（判定不能）ときは空配列が返り、節ごと出ない。
    ...(holland.length > 0
      ? [el("h2", { text: "ホランド型" }),
         el("div", { class: "prose holland" }, holland.map((line) => el("p", { text: line })))]
      : []),
    ...linkage,
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
