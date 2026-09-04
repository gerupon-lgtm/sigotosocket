import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveVisibilityAid, contrastRatio, relativeLuminance, parseColor,
  AID_LEVEL, OUTLINE_THRESHOLD, PLATE_THRESHOLD, DEFAULT_SUBJECT_TONES,
} from "../js/domain/visibility-aid.js";

test("コントラスト比は WCAG の定義どおり（黒白で21:1）", () => {
  assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1e-6);
  assert.equal(contrastRatio("#4f8f7c", "#4f8f7c"), 1);
  assert.ok(relativeLuminance("#ffffff") > relativeLuminance("#000000"));
});

test("色の記法をゆるく受ける／不正は例外", () => {
  assert.deepEqual(parseColor("#fff"), parseColor("#ffffff"));
  assert.deepEqual(parseColor("4F8F7C"), parseColor("#4f8f7c"));
  for (const bad of ["", "#12", "rgb(0,0,0)", 123, null]) {
    assert.throws(() => parseColor(bad), /COLOR_INVALID/);
  }
});

test("地色と十分に離れていれば補助を出さない", () => {
  const aid = resolveVisibilityAid("#1b2a26", { light: "#ffffff", dark: "#e0e0e0" });
  assert.equal(aid.level, AID_LEVEL.NONE);
  assert.equal(aid.outline, null);
  assert.equal(aid.shadow, false);
  assert.equal(aid.plateColor, null);
});

test("片側だけ沈むときは明暗二重の縁取りと影（プレートは出さない）", () => {
  // 現行のカード地色。むっくんのクリーム色の顔が溶ける。
  const aid = resolveVisibilityAid("#f3f7f4", DEFAULT_SUBJECT_TONES);
  assert.equal(aid.level, AID_LEVEL.OUTLINE);
  assert.ok(aid.lightContrast < OUTLINE_THRESHOLD, "明側は地色へ沈む");
  assert.ok(aid.strongest >= PLATE_THRESHOLD, "暗側は残っている");
  assert.equal(aid.outline.light, "#ffffff");
  assert.equal(aid.outline.dark, "#3b4a45");
  assert.equal(aid.shadow, true);
  assert.equal(aid.plateColor, null);
});

test("両側とも沈むときだけ背景プレートを敷く", () => {
  const aid = resolveVisibilityAid("#a08e78", { light: "#b5a794", dark: "#8b7c68" });
  assert.equal(aid.level, AID_LEVEL.PLATE);
  assert.ok(aid.strongest < PLATE_THRESHOLD);
  assert.ok(aid.plateColor);
  assert.ok(aid.outline, "プレートを敷いても縁取りは併用する");
});

test("プレートは地色の明暗と反対側の中立色になる", () => {
  const onLight = resolveVisibilityAid("#d8d2c8", { light: "#dcd6cc", dark: "#cfc9bf" });
  const onDark = resolveVisibilityAid("#3a3a3a", { light: "#404040", dark: "#343434" });
  assert.equal(onLight.plateColor, "#e4e9e6");
  assert.equal(onDark.plateColor, "#f7f9f8");
});

test("同じ入力なら常に同じ結果（プレビューと保存画像が食い違わない）", () => {
  const a = resolveVisibilityAid("#f3f7f4", DEFAULT_SUBJECT_TONES);
  const b = resolveVisibilityAid("#f3f7f4", DEFAULT_SUBJECT_TONES);
  assert.deepEqual(a, b);
});

test("キャラクターの色そのものは返さない（再配色しない方針）", () => {
  const aid = resolveVisibilityAid("#f3f7f4", DEFAULT_SUBJECT_TONES);
  const values = JSON.stringify(aid);
  assert.ok(!values.includes(DEFAULT_SUBJECT_TONES.light));
  assert.ok(!values.includes(DEFAULT_SUBJECT_TONES.dark));
});

test("トーンが不正なら例外", () => {
  assert.throws(() => resolveVisibilityAid("#ffffff", null), /VISIBILITY_TONES_INVALID/);
  assert.throws(() => resolveVisibilityAid("#ffffff", { light: "nope", dark: "#000" }), /COLOR_INVALID/);
});
