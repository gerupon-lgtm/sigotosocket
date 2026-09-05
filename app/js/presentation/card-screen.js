import { el } from "./screen-helpers.js";
import { renderCard } from "../infrastructure/card-renderer.js";

export function renderCardScreen({ snapshot, onBack }) {
  const status = el("p", { class: "meta", text: "カードを生成しています…" });
  const holder = el("div", { class: "card-holder" });
  const actions = el("div", { class: "actions" });

  const section = el("section", { class: "screen card" }, [
    el("h1", { text: "結果カード" }),
    holder,
    status,
    actions,
    el("div", { class: "actions" }, [
      el("button", { class: "secondary", type: "button", onClick: onBack }, "結果へ戻る"),
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
