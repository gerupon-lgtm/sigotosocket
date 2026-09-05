import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { CharacterManifest } from "../js/data/character-manifest.js";
import { FORBIDDEN_PHRASES } from "../js/domain/result-composer.js";
import { SCALE_ORDER } from "../js/data/scale-order.js";
import { appMeta } from "../js/config/app-meta.js";

const APP = new URL("../", import.meta.url);
const entries = [...CharacterManifest.poses, ...CharacterManifest.props];

test("manifest の版数は app-meta と一致する", () => {
  assert.equal(CharacterManifest.assetVersion, appMeta.characterManifestVersion);
});

test("8領域それぞれにポーズと小物がある（欠番なし）", () => {
  for (const scaleId of SCALE_ORDER) {
    assert.ok(CharacterManifest.poses.some((e) => e.characterId === scaleId), `ポーズ ${scaleId} がない`);
    assert.ok(CharacterManifest.props.some((e) => e.characterId === scaleId), `小物 ${scaleId} がない`);
  }
  // 判定不能のときに使う中立ポーズ（T-015）
  assert.ok(CharacterManifest.poses.some((e) => e.characterId === "neutral"), "中立ポーズがない");
});

test("manifest と実ファイルが1対1で対応する", () => {
  const onDisk = [
    ...readdirSync(new URL("assets/characters/", APP)).filter((n) => n.endsWith(".webp"))
      .map((n) => `assets/characters/${n}`),
    ...readdirSync(new URL("assets/props/", APP)).filter((n) => n.endsWith(".webp"))
      .map((n) => `assets/props/${n}`),
  ].sort();
  assert.deepEqual(entries.map((e) => e.imagePath).sort(), onDisk,
    "manifest に無いファイル、または実体の無い項目がある");
});

test("integrity は実ファイルの sha256 と一致する", () => {
  for (const entry of entries) {
    const file = new URL(entry.imagePath, APP);
    assert.ok(existsSync(file), `${entry.imagePath} が無い`);
    const actual = `sha256-${createHash("sha256").update(readFileSync(file)).digest("base64")}`;
    assert.equal(entry.integrity, actual, `${entry.characterId} のハッシュが合わない`);
  }
});

test("alt は全件にあり、職業や優劣を持ち込まない", () => {
  for (const entry of entries) {
    assert.ok(entry.alt && entry.alt.trim().length > 0, `${entry.characterId} の alt が空`);
    for (const phrase of FORBIDDEN_PHRASES) {
      assert.ok(!entry.alt.includes(phrase), `${entry.characterId} の alt に禁止語「${phrase}」`);
    }
    // 変更禁止事項6: 職業そのものを描かない。所作と道具で書く。
    for (const word of ["職業", "適職", "向いている", "な仕事", "士", "師", "官"]) {
      assert.ok(!entry.alt.includes(word), `${entry.characterId} の alt に職業を思わせる語「${word}」`);
    }
  }
});
