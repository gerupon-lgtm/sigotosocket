import { el } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { screenHeading } from "./screen-heading.js";
import { appMeta } from "../config/app-meta.js";

export function renderAboutScreen({ onBack, onClearAll }) {
  return el("section", { class: "screen about" }, [
    appHeader({ action: { label: "戻る", onClick: onBack } }),
    screenHeading({ kicker: "ABOUT", title: "この診断について" }),

    el("h2", { text: "医学的・心理学的な検査ではありません" }),
    el("p", { text: "結果は自己理解の手がかりであり、能力や適性を判定するものではありません。診断名や適職を示すものでもありません。" }),

    el("h2", { text: "使っている尺度" }),
    el("p", { text: "ORVIS（Oregon Vocational Interest Scales）の日本語短縮版45問を使用しています。ORVISはIPIP（International Personality Item Pool）に収録されたパブリックドメインの尺度です。" }),
    el("ul", {}, [
      el("li", {}, [el("a", { href: "https://projects.ori.org/lrg/PDFs_papers/Pozzebon_etal_2009_ORVIS_JPA.pdf", target: "_blank", rel: "noopener noreferrer" }, "Pozzebon et al. (2010) ORVIS 原論文")]),
      el("li", {}, [el("a", { href: "https://ipip.ori.org/", target: "_blank", rel: "noopener noreferrer" }, "International Personality Item Pool")]),
    ]),
    el("p", { class: "meta", text: "項目は日本語へ翻訳し、日本の文脈に合わせて一部を調整しています。この日本語版は独立した妥当性の検証を受けていません。" }),

    el("h2", { text: "得点の読み方" }),
    el("p", { text: "高い・低いは、あなたの8領域どうしを比べた結果です。ほかの人と比べたものではありません。日本語版の規範データが存在しないため、集団との比較は行いません。" }),

    el("h2", { text: "使っているフォント" }),
    el("p", { text: "称号の表示に Noto Serif JP（© 2017-2023 Adobe）を、必要な文字だけに絞って同梱しています。SIL Open Font License 1.1 で提供されているものです。" }),
    el("p", { class: "meta", text: "許諾の全文は assets/fonts/OFL.txt に同梱しています。" }),

    el("h2", { text: "データの扱い" }),
    el("p", { text: "回答と結果はこの端末のブラウザにのみ保存されます。サーバーへは送信しません。" }),
    el("div", { class: "actions" }, [
      el("button", { class: "danger", type: "button", onClick: onClearAll }, "この端末に保存したデータを削除"),
      el("button", { class: "secondary", type: "button", onClick: onBack }, "戻る"),
    ]),
    el("p", { class: "meta", text: `版数 ${appMeta.appVersion}` }),
  ]);
}
