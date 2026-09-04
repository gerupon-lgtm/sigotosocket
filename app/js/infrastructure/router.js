export const ROUTES = Object.freeze(["start", "answer", "result", "card", "about"]);
export const CANONICAL_HASH = "#/start";

const HASH_BY_ROUTE = Object.freeze({
  start: "#/start",
  answer: "#/answer",
  result: "#/result",
  card: "#/card",
  about: "#/about",
});

/** 未知のハッシュは #/start へ正規化する。問番号はURLに持たない。 */
export function resolveRoute(hash) {
  const normalized = typeof hash === "string" ? hash.split("?")[0] : "";
  const id = normalized.replace(/^#\//, "");
  return ROUTES.includes(id) ? id : "start";
}

export function hashFor(route) {
  return HASH_BY_ROUTE[route] ?? CANONICAL_HASH;
}
