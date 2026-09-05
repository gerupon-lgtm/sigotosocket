import { el } from "./screen-helpers.js";
import { appHeader } from "./app-header.js";
import { screenHeading } from "./screen-heading.js";
import { renderCard } from "../infrastructure/card-renderer.js";
import { composeShareResultText } from "../domain/share-result-text.js";

export function renderCardScreen({ snapshot, onBack, onHome }) {
  const status = el("p", { class: "meta", text: "カードを生成しています…" });
  const holder = el("div", { class: "card-holder" });
  const actions = el("div", { class: "actions" });
  const shareText = composeShareResultText({ snapshot });
  let cardCanvas = null;

  const toBlob = () => new Promise((resolve) => {
    if (!cardCanvas) { resolve(null); return; }
    try { cardCanvas.toBlob(resolve, "image/png"); } catch { resolve(null); }
  });

  actions.appendChild(el("button", { class: "primary", type: "button", onClick: async () => {
    const blob = await toBlob();
    if (!blob) { status.textContent = "この環境では画像を保存できませんでした。画面のスクリーンショットをお使いください。"; return; }
    const objectUrl = URL.createObjectURL(blob);
    const link = el("a", { href: objectUrl, download: "sigotosocket-card.png" });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    status.textContent = "画像を保存しました。";
  } }, "画像を保存"));

  actions.appendChild(el("button", { class: "secondary", type: "button", onClick: async () => {
    const blob = await toBlob();
    try {
      const file = blob && typeof globalThis.File === "function"
        ? new globalThis.File([blob], "sigotosocket-card.png", { type: "image/png" })
        : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: "シゴトソケットの結果", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        status.textContent = "共有に対応していないため、結果テキストをコピーしました。";
        return;
      }
      status.textContent = "共有しました。";
    } catch {
      status.textContent = "共有できませんでした。画像の保存かテキストのコピーをお試しください。";
    }
  } }, "共有"));

  actions.appendChild(el("button", { class: "secondary", type: "button", onClick: async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      status.textContent = "結果テキストをコピーしました。";
    } catch {
      status.textContent = "コピーできませんでした。結果画面へ戻ると、同じ内容を選んでコピーできます。";
    }
  } }, "テキストをコピー"));

  const section = el("section", { class: "screen card" }, [
    appHeader({ action: { label: "結果へ戻る", onClick: onBack } }),
    screenHeading({ kicker: "RESULT CARD", title: "結果カード" }),
    el("div", { class: "panel" }, [holder, status, actions]),
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
      cardCanvas = canvas;
      status.textContent = "画像として保存したり、共有したりできます。";
    } catch {
      status.textContent = "カードを生成できませんでした。結果はテキストで確認できます。";
    }
  })();

  return section;
}
