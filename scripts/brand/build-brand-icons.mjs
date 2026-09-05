// マークSVGから、ホーム画面用アイコンとOGP画像を書き出す。
// 手で描いた画像を置かない。マークを直せば全部が追随する。
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import sharp from "sharp";
import { buildMarkSvg, MARK } from "../../app/js/presentation/mark.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BRAND = join(ROOT, "app/assets/brand");
const BG = "#f4f6fa";
const INK = "#1b2a44";
const SUB = "#4a5b7a";
const FONT = 'system-ui, "Noto Sans CJK JP", "Hiragino Sans", sans-serif';

async function main() {
  await mkdir(BRAND, { recursive: true });
  // アプリアイコンには判定が関わらないため、点灯の順序に意味はない。
  // MARK.lit の並びを変えても見た目が変わらないよう [0, 7] で固定する（従来と同一の画になる）。
  const ICON_LIT = [0, 7];
  const markSvg = Buffer.from(buildMarkSvg(ICON_LIT));
  await writeFile(join(BRAND, "sigotosocket-mark.svg"), buildMarkSvg(ICON_LIT));

  for (const size of [180, 192, 512]) {
    await sharp(markSvg, { density: 384 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(join(BRAND, `sigotosocket-icon-${size}.png`));
  }

  // OGP画像 1200x630。マークと名前だけ。文言は本文と重複させない。
  const W = 1200, H = 630, M = 220;
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="${W / 2}" y="430" font-family='${FONT}' font-size="76" font-weight="bold" fill="${INK}" text-anchor="middle">シゴトソケット</text>
  <text x="${W / 2}" y="500" font-family='${FONT}' font-size="32" fill="${SUB}" text-anchor="middle">やってみたいことのかたちを見る</text>
</svg>`;
  const mark = await sharp(markSvg, { density: 384 }).resize(M, M).png().toBuffer();
  await sharp(Buffer.from(text))
    .composite([{ input: mark, left: Math.round((W - M) / 2), top: 120 }])
    .png({ compressionLevel: 9 })
    .toFile(join(BRAND, "ogp.png"));

  console.log(`ブランド画像 OK: 180/192/512 と ogp.png（地 ${MARK.tile}）`);
}

await main();
