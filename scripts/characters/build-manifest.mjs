import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PoseAlt, PropAlt, GuestAlt } from "./character-alt.js";
import { appMeta } from "../../app/js/config/app-meta.js";

/**
 * キャラクターアセットの目録を作る（T-015・F-019）。
 *
 *   npm run character:manifest
 *
 * ハッシュと寸法は実ファイルから採る。altは `character-alt.js` の手書きを写す。
 * **生成物は手で編集しない。**アセットを差し替えたらこれを実行し直すこと。
 * 実行し忘れは `app/tests/character-manifest.test.js` がハッシュ不一致で落として知らせる。
 */

const APP = new URL("../../app/", import.meta.url);
const OUT = new URL("js/data/character-manifest.js", APP);
const SIZE = 1024;

async function collect(dir, prefix, altTable) {
  const names = readdirSync(new URL(`assets/${dir}/`, APP))
    .filter((name) => name.endsWith(".webp"))
    .sort();
  const entries = [];
  for (const name of names) {
    const characterId = name.replace(prefix, "").replace(/\.webp$/, "");
    const imagePath = `assets/${dir}/${name}`;
    const bytes = readFileSync(new URL(imagePath, APP));
    const meta = await sharp(bytes).metadata();
    if (meta.width !== SIZE || meta.height !== SIZE) {
      throw new Error(`${name}: ${meta.width}×${meta.height}。${SIZE}×${SIZE} でない`);
    }
    const alt = altTable[characterId];
    if (!alt) throw new Error(`${name}: altが character-alt.js にない（characterId=${characterId}）`);
    // 透明余白を除いた実体の矩形。**2体を並べるときはここを基準にする**（F-022）。
    // 箱で並べると、余白の量が絵ごとに違うぶん見た目の隙間が揃わない。
    const trimmed = await sharp(bytes).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    const body = {
      x: -trimmed.info.trimOffsetLeft,
      y: -trimmed.info.trimOffsetTop,
      w: trimmed.info.width,
      h: trimmed.info.height,
    };
    entries.push({
      characterId,
      imagePath,
      alt,
      body,
      width: meta.width,
      height: meta.height,
      integrity: `sha256-${createHash("sha256").update(bytes).digest("base64")}`,
    });
  }
  return entries;
}

const poses = await collect("characters", "character-pose-", PoseAlt);
const props = await collect("props", "prop-", PropAlt);
// ゲスト（F-022）。**自オリジンに置く**（決めごとA-3：他オリジンの画像はcanvasを汚染する）
const guests = await collect("guest", "guest-", GuestAlt);

const render = (entries) => entries.map((e) => `  Object.freeze({\n`
  + `    characterId: ${JSON.stringify(e.characterId)},\n`
  + `    imagePath: ${JSON.stringify(e.imagePath)},\n`
  + `    alt: ${JSON.stringify(e.alt)},\n`
  + `    width: ${e.width}, height: ${e.height},\n`
  + `    body: Object.freeze({ x: ${e.body.x}, y: ${e.body.y}, w: ${e.body.w}, h: ${e.body.h} }),
`
  + `    integrity: ${JSON.stringify(e.integrity)},\n`
  + `  }),`).join("\n");

writeFileSync(OUT, `// 生成物。手で編集しない。
// 生成: npm run character:manifest
// alt の出どころ: scripts/characters/character-alt.js（手書き）
// ハッシュと寸法の出どころ: app/assets/ の実ファイル

export const CharacterManifest = Object.freeze({
  assetVersion: ${JSON.stringify(appMeta.characterManifestVersion)},
  poses: Object.freeze([
${render(poses)}
  ]),
  props: Object.freeze([
${render(props)}
  ]),
  guests: Object.freeze([
${render(guests)}
  ]),
});

/** characterId からポーズの項目を引く。無ければ null。 */
export function poseFor(characterId) {
  return CharacterManifest.poses.find((e) => e.characterId === characterId) ?? null;
}

/** characterId から小物の項目を引く。無ければ null。 */
export function propFor(characterId) {
  return CharacterManifest.props.find((e) => e.characterId === characterId) ?? null;
}

/** ゲスト出演の図柄を引く。無ければ null。 */
export function guestFor(characterId) {
  return CharacterManifest.guests.find((e) => e.characterId === characterId) ?? null;
}
`);

console.log(`manifest OK: ポーズ${poses.length}件 / 小物${props.length}件 / ゲスト${guests.length}件 → ${fileURLToPath(OUT)}`);
