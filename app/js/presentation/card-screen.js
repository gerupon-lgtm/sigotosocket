import { el } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { renderCard } from "../infrastructure/card-renderer.js";

/**
 * 共有に使うURL。**フラグメントを落とす。**得点や連携コード（`#b5=`）を
 * 他人へ渡さないため。回答値・得点をURLに含めない方針（T-017）の実装でもある。
 */
function shareableUrl(href) {
  try {
    const url = new URL(href);
    url.hash = "";
    return url.toString();
  } catch {
    return String(href ?? "").split("#")[0];
  }
}

export function renderCardScreen({ snapshot, onBack, onHome, shareUrl }) {
  const status = el("p", { class: "meta", text: "カードを生成しています…" });
  const holder = el("div", { class: "card-holder" });
  const actions = el("div", { class: "actions" });
  const url = shareableUrl(shareUrl ?? globalThis.location?.href ?? "");
  const shareStatus = el("p", { class: "meta" });

  // URLは同期で出す。カードの生成に失敗しても、共有先は分かるようにしておく。
  const share = el("div", { class: "share" }, [
    el("p", { class: "share-label", text: "このページのURL" }),
    el("p", { class: "share-url", text: url }),
    el("p", { class: "note", text: "このURLは診断ページのものです。あなたの回答や点数は含まれません。" }),
    el("div", { class: "actions" }, [
      el("button", { class: "secondary", type: "button", onClick: async () => {
        try {
          await navigator.clipboard.writeText(url);
          shareStatus.textContent = "URLをコピーしました。";
        } catch {
          // クリップボードが使えない環境でも、上のURLは選んでコピーできる。
          shareStatus.textContent = "コピーできませんでした。上のURLを選んでコピーしてください。";
        }
      } }, "URLをコピー"),
    ]),
    shareStatus,
  ]);

  const section = el("section", { class: "screen card" }, [
    appHeader({ screenLabel: "結果カード" }),
    el("h1", { text: "結果カード" }),
    holder,
    status,
    actions,
    share,
    el("div", { class: "actions" }, [
      el("button", { class: "secondary", type: "button", onClick: onBack }, "結果へ戻る"),
      el("button", { class: "link", type: "button", onClick: onHome }, "トップへ戻る"),
    ]),
  ]);

  (async () => {
    try {
      const canvas = document.createElement("canvas");
      // alt は描けたものだけを言う（card-renderer.js の cardAltText）。
      const { alt } = await renderCard(canvas, snapshot);
      canvas.className = "card-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", alt);
      holder.appendChild(canvas);
      status.textContent = "画像として保存したり、共有したりできます。";

      const toBlob = () => new Promise((resolve) => {
        try { canvas.toBlob(resolve, "image/png"); } catch { resolve(null); }
      });

      actions.appendChild(el("button", { class: "primary", type: "button", onClick: async () => {
        const blob = await toBlob();
        if (!blob) { status.textContent = "この環境では画像を保存できませんでした。画面のスクリーンショットをお使いください。"; return; }
        const url = URL.createObjectURL(blob);
        const link = el("a", { href: url, download: "sigotosocket-card.png" });
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        status.textContent = "画像を保存しました。";
      } }, "画像を保存"));

      actions.appendChild(el("button", { class: "secondary", type: "button", onClick: async () => {
        const blob = await toBlob();
        const file = blob ? new File([blob], "sigotosocket-card.png", { type: "image/png" }) : null;
        // 端末の共有メニュー → 使えなければURLコピーへ落とす。
        try {
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: "シゴトソケットの結果" });
            status.textContent = "共有しました。";
            return;
          }
          if (navigator.share) {
            await navigator.share({ title: "シゴトソケット", url: location.href });
            status.textContent = "共有しました。";
            return;
          }
          await navigator.clipboard.writeText(location.href);
          status.textContent = "共有に対応していないため、URLをコピーしました。";
        } catch {
          status.textContent = "共有できませんでした。画像の保存をお試しください。";
        }
      } }, "共有"));
    } catch {
      status.textContent = "カードを生成できませんでした。結果はテキストで確認できます。";
    }
  })();

  return section;
}
