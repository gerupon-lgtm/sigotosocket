export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "style") {
      // **style属性を使わない。**index.html の CSP が `style-src 'self'` なので、
      // `setAttribute("style", ...)` はブラウザに黙って無視される（CSSOM は通る）。
      // エラーも出ないので、**文字列で渡されたらここで落とす。**
      // 一度これでプログレスバーが動かない状態を公開した（2026-09-05）。
      if (typeof value === "string") throw new TypeError("STYLE_MUST_BE_OBJECT_CSP");
      for (const [property, declaration] of Object.entries(value ?? {})) {
        node.style[property] = declaration;
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined && value !== false) {
      node.setAttribute(key, value === true ? "" : String(value));
    }
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** UTCで保存した日時を、利用者の環境タイムゾーンで表示する。取得できなければJST。 */
export function formatDateTime(isoUtc) {
  let timeZone;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  } catch {
    timeZone = "Asia/Tokyo";
  }
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}
