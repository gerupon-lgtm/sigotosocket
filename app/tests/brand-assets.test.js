import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { appMeta } from "../js/config/app-meta.js";
import { buildMarkSvg, holeCenter, MARK } from "../js/presentation/mark.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(ROOT, "app/index.html"), "utf8");

test("canonical と og:url が siteOrigin と一致する", () => {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const ogUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1];
  assert.equal(canonical, `${appMeta.siteOrigin}/`);
  assert.equal(ogUrl, `${appMeta.siteOrigin}/`);
});

test("HTMLが参照するブランド資産が実在する", () => {
  const refs = [
    "app/manifest/app.webmanifest",
    "app/assets/brand/sigotosocket-mark.svg",
    "app/assets/brand/sigotosocket-icon-180.png",
    "app/assets/brand/sigotosocket-icon-192.png",
    "app/assets/brand/sigotosocket-icon-512.png",
    "app/assets/brand/ogp.png",
  ];
  for (const rel of refs) assert.ok(existsSync(join(ROOT, rel)), `${rel} がない`);
});

test("webmanifestのアイコンが実在する", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "app/manifest/app.webmanifest"), "utf8"));
  for (const icon of manifest.icons) {
    const rel = join("app/manifest", icon.src);
    assert.ok(existsSync(join(ROOT, rel)), `${icon.src} がない`);
  }
});

test("マークは8口で、点灯は先頭が1位の色になる", () => {
  const svg = buildMarkSvg([3, 5]);
  assert.equal((svg.match(/<circle/g) ?? []).length, 8);
  const p3 = holeCenter(3);
  const p5 = holeCenter(5);
  assert.match(svg, new RegExp(`cx="${p3.x.toFixed(1)}" cy="${p3.y.toFixed(1)}" r="11" fill="${MARK.lit[0]}"`));
  assert.match(svg, new RegExp(`cx="${p5.x.toFixed(1)}" cy="${p5.y.toFixed(1)}" r="11" fill="${MARK.lit[1]}"`));
});

test("点灯を指定しなければ全口が未点灯色になる", () => {
  const svg = buildMarkSvg([]);
  assert.equal((svg.match(new RegExp(MARK.unlit, "g")) ?? []).length, 8);
});

test("マークは12時から時計回りに並ぶ", () => {
  const top = holeCenter(0);
  assert.ok(Math.abs(top.x - 60) < 0.05);
  assert.ok(top.y < 60);
  assert.ok(holeCenter(2).x > 60, "2番目は3時側");
});
