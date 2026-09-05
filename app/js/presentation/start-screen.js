import { el } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { screenHeading } from "./screen-heading.js";
import { TOTAL_ITEM_COUNT, answeredCount } from "../domain/response-state.js";
import { STORAGE_STATUS } from "../infrastructure/progress-storage.js";
import { appMeta } from "../config/app-meta.js";
import { linkageGuide } from "./linkage-guide.js";


/**
 * 閉じたまま置く説明パネル。開いた人にだけ読ませる（ココロパレアの
 * `.start-introduction` と同じ作り）。トップの本筋は「はじめる」であって、
 * 説明で埋めない。
 *
 * 文言の約束（決めごとB-1・6）:
 * - 他人との比較を書かない
 * - 職業を挙げない。むっくんの説明も「道具と所作」にとどめる
 */
function toolIntro() {
  const topic = (title, lines) => el("div", { class: "intro-topic" }, [
    el("h2", { class: "intro-topic-title", text: title }),
    ...lines.map((line) => el("p", { text: line })),
  ]);

  return el("details", { class: "tool-intro" }, [
    el("summary", {}, [
      el("img", {
        class: "intro-summary-mark",
        src: "assets/brand/mukkun-face.webp",
        alt: "",          // 装飾。読み上げは隣の文言が担う
        width: "44", height: "44",
      }),
      el("span", { class: "intro-summary-copy" }, [
        el("span", { text: "このツールのこと。" }),
        el("br"),
        el("span", { text: "連携でできること。" }),
        el("br"),
        el("span", { text: "むっくんのこと。" }),
      ]),
    ]),
    el("div", { class: "intro-body" }, [
      topic("このツールについて", [
        "ORVIS（職業興味の尺度）の日本語短縮版45問から、8つの領域への関心を見ます。"
        + "出るのは「あなたの中でどの領域が高いか」で、ほかの人と比べた順位ではありません。",
        "回答と結果はこの端末のブラウザにだけ残り、サーバーへは送りません。",
      ]),
      topic("ココロパレアと連携すると", [
        "ココロパレアは、ビッグファイブ（IPIP日本語50項目版）で性格の傾向を見る姉妹アプリです。",
        "あちらの結果をこちらへ渡すと、性格の5因子とこちらの8領域を照らし合わせます。"
        + "ORVISの原典で結びつきが報告されている6つの組み合わせについて、"
        + "その結果に応じて追加の説明が出ます。",
        "手仕事と挑戦の2領域はビッグファイブとほとんど関係が見られないため、"
        + "そこが上位に来た人には「性格からは予測できない興味」も加わります。",
        "渡すのは5つの数値だけです。回答そのものは行き来しません。",
      ]),
      el("p", { class: "intro-link" }, [
        el("a", {
          href: appMeta.brand.siblingUrl,
          rel: "noreferrer",
        }, `${appMeta.brand.siblingName}を開く`),
      ]),
      // 「準備中」と書いていたが、ココロパレア側の受け渡しが公開された（2026-09-05）。
      // 代わりに**どこから渡せるか**を書く。渡せる場所が分からないと連携に辿り着けない。
      el("p", { class: "intro-note", text: "※ 渡せるのはココロパレアの「50問の詳細結果」からです。" }),

      topic("むっくんについて", [
        "案内役のハリネズミです。8つの領域を、道具と所作の違いで見せ分けます。",
      ]),
    ]),
  ]);
}

function linkageReceiptCard(receipt) {
  if (!receipt || !["received", "updated"].includes(receipt.kind)) return null;
  const updated = receipt.kind === "updated";
  const body = [];
  body.push(el("h2", { text: updated
    ? "ココロパレアの結果を更新しました"
    : "ココロパレアの結果を受け取りました" }));
  if (updated) {
    body.push(el("p", { text: "以前の連携情報を、今回渡された結果に置き換えました。最後に渡した結果だけが使われます。" }));
  }
  body.push(el("p", { text: receipt.hasResult
    ? "前回のシゴトソケット結果へ反映しました。再回答は必要ありません。"
    : "シゴトソケットの45問を終えると、2つの結果を合わせて確認できます。" }));
  return el("section", { class: "linkage-receipt", role: "status" }, body);
}

export function renderStartScreen({
  progressState,
  latestResult,
  storageStatus,
  linkageReceipt = null,
  onStart,
  onResume,
  onShowResult,
  onAbout,
}) {
  const hasProgress = progressState && answeredCount(progressState) > 0;
  const actions = [
    el("button", { class: "primary", type: "button", onClick: onStart },
      hasProgress
        ? "はじめから回答する"
        : linkageReceipt && !latestResult ? "45問を始める" : "はじめる"),
  ];
  if (hasProgress) {
    actions.unshift(el("button", { class: "primary", type: "button", onClick: onResume },
      `続きから（${answeredCount(progressState)} / ${TOTAL_ITEM_COUNT}問）`));
  }
  if (latestResult) {
    actions.push(el("button", { class: "secondary", type: "button", onClick: onShowResult },
      linkageReceipt?.hasResult ? "組み合わせた結果を見る" : "前回の結果を見る"));
  }

  const notices = [];
  if (storageStatus === STORAGE_STATUS.UNAVAILABLE) {
    notices.push(el("p", { class: "notice", text: "このブラウザではデータを保存できない設定になっています。回答は画面を閉じるまでの間だけ保持されます。" }));
  }
  if (storageStatus === STORAGE_STATUS.SCHEMA_MISMATCH) {
    notices.push(el("p", { class: "notice", text: "以前の版で保存したデータが見つかりましたが、今の版では読み込めません。データは消さずに残しています。" }));
  }

  const receipt = linkageReceiptCard(linkageReceipt);
  return el("section", { class: "screen start" }, [
    appHeader({}),
    el("div", { class: "panel" }, [
      screenHeading({ kicker: "INTEREST CHECK", title: "やってみたいことを知る" }),
      el("p", { class: "lead", text: "8つの領域から、あなたが「やってみたい」と感じる方向を見つけます。" }),
      el("p", { class: "meta", text: `全${TOTAL_ITEM_COUNT}問・所要およそ5分` }),
      // 説明は「はじめる」の上に置く（ココロパレアと同じ並び）
      toolIntro(),
      ...(receipt ? [receipt] : []),
      ...notices,
      el("div", { class: "actions" }, actions),
    ]),
    linkageGuide(),
    el("p", { class: "disclaimer" }, [
      "この診断は医学的・心理学的な検査ではありません。結果は自己理解の手がかりとしてお使いください。",
      el("br"),
      el("button", { class: "link", type: "button", onClick: onAbout }, "出典・免責・データの扱い"),
    ]),
  ]);
}
