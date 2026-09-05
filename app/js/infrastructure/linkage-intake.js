import { appMeta } from "../config/app-meta.js";
import { readBigFiveCodeFromHash, parseBigFiveCode } from "../domain/big-five-link.js";
import { CANONICAL_HASH } from "./router.js";

/**
 * 起動時にURLフラグメントの結果コードを受け取る（F-010・T-025）。
 *
 * **成否によらずフラグメントを消す。**得点が入ったURLをそのまま共有されると、
 * こちらの「サーバーへ送らない」という約束の外側で他人へ渡ってしまう。
 * 受け取れなかったコードも同じで、URLに残しておく理由がない。
 *
 * **不正なコードをエラーとして見せない**（`docs/api-design.md` §1-3）。
 * 利用者から見れば、他アプリのコードの不備でこちらが止まる理由がない。
 */
export function receiveBigFive({
  location, history, store,
  now = new Date(),
  enabled = appMeta.linkageEnabled,
} = {}) {
  const code = readBigFiveCodeFromHash(location?.hash ?? "");
  if (code === null) return null;

  const link = enabled ? parseBigFiveCode(code, { now }) : null;
  if (link) store.saveBigFive(link);

  // 履歴APIが使えない環境（古いブラウザ・厳しい設定）でも受け取り自体は成立させる。
  try {
    const { pathname = "", search = "" } = location;
    history?.replaceState?.(null, "", `${pathname}${search}${CANONICAL_HASH}`);
  } catch {
    // URLは消せなかったが、保存はできている。ここで落とさない。
  }
  return link;
}
