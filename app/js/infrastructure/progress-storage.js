import { appMeta } from "../config/app-meta.js";

export const STORAGE_KEY = appMeta.storageKey;
export const STORAGE_STATUS = Object.freeze({
  OK: "ok",
  UNAVAILABLE: "unavailable",          // localStorage 自体が使えない
  SCHEMA_MISMATCH: "schema-mismatch",  // 読み捨てず保持する
});

function emptyEnvelope(now) {
  return {
    schemaVersion: appMeta.storageSchemaVersion,
    updatedAt: now,
    progress: null,
    results: [],
    bigFive: null,
  };
}

function resolveStorage(injected) {
  // 注入されたものも含めて必ず書き込み可否を確かめる。
  // プライベートモードのように「存在はするが書けない」storage があるため。
  try {
    const storage = injected ?? globalThis.localStorage;
    if (!storage) return null;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * localStorage が使えない環境（プライベートモード・容量超過）でも診断は続けられる。
 * その場合はメモリ上のみで動作し、画面にその旨を表示する。
 */
export function createStore({ storage: injected, now = () => new Date().toISOString() } = {}) {
  const storage = resolveStorage(injected);
  let memory = emptyEnvelope(now());
  let persistent = Boolean(storage);
  let schemaMismatch = false;

  function read() {
    if (!persistent) return memory;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return memory;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return memory;
      if (parsed.schemaVersion !== appMeta.storageSchemaVersion) {
        // 移行できない版のデータは消さずに残し、利用者へ知らせる。
        schemaMismatch = true;
        return memory;
      }
      memory = {
        schemaVersion: parsed.schemaVersion,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : now(),
        progress: parsed.progress ?? null,
        results: Array.isArray(parsed.results) ? parsed.results : [],
        bigFive: parsed.bigFive ?? null,
      };
      return memory;
    } catch {
      return memory;
    }
  }

  function write(next) {
    memory = { ...next, updatedAt: now() };
    if (!persistent || schemaMismatch) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      persistent = false; // 以降はメモリ動作へ落とす
    }
  }

  return {
    get status() {
      if (schemaMismatch) return STORAGE_STATUS.SCHEMA_MISMATCH;
      return persistent ? STORAGE_STATUS.OK : STORAGE_STATUS.UNAVAILABLE;
    },
    load() { return read(); },
    saveProgress(progress) { const env = read(); write({ ...env, progress }); },
    clearProgress() { const env = read(); write({ ...env, progress: null }); },
    saveResult(snapshot) {
      const env = read();
      write({ ...env, progress: null, results: [snapshot, ...env.results].slice(0, 50) });
    },
    latestResult() { return read().results[0] ?? null; },
    clearAll() {
      memory = emptyEnvelope(now());
      schemaMismatch = false;
      if (!persistent) return;
      try { storage.removeItem(STORAGE_KEY); } catch { persistent = false; }
    },
  };
}
