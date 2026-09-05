import { brotliDecompressSync } from "node:zlib";

/**
 * WOFF2 から cmap を読み、収録されている符号位置の集合を返す。
 *
 * 同梱フォントに実際にグリフがあるかを **テストから依存なしで** 確かめるために置いている。
 * CI は `npm ci` を実行せず node_modules 無しで `npm test` を走らせるため、
 * フォント関連の npm パッケージをテストから読んではいけない。
 *
 * cmap は WOFF2 の変換対象ではない（変換されるのは glyf と loca のみ）ので、
 * テーブル一覧で位置を求め、伸長した塊から切り出せばそのまま読める。
 * 仕様: https://www.w3.org/TR/WOFF2/
 */

// WOFF2 の既知テーブルタグ（インデックス順）。必要なのは cmap の位置だけだが、
// その手前にあるテーブルの長さを足し合わせる必要があるため全件を持つ。
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm",
  "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern",
  "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC",
  "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty",
  "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
  "Gloc", "Feat", "Sill",
];

function readUIntBase128(buf, pos) {
  let value = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = buf.readUInt8(pos + i);
    if (i === 0 && byte === 0x80) throw new Error("WOFF2_BASE128_LEADING_ZERO");
    if (value > 0x01ffffff) throw new Error("WOFF2_BASE128_OVERFLOW");
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return [value >>> 0, pos + i + 1];
  }
  throw new Error("WOFF2_BASE128_TOO_LONG");
}

/** 伸長後の塊の中での cmap の位置と長さを求める。 */
function locateCmap(buf) {
  if (buf.toString("latin1", 0, 4) !== "wOF2") throw new Error("WOFF2_BAD_SIGNATURE");
  const numTables = buf.readUInt16BE(12);
  let pos = 48;
  let offset = 0;
  let found = null;

  for (let i = 0; i < numTables; i += 1) {
    const flags = buf.readUInt8(pos);
    pos += 1;
    const tagIndex = flags & 0x3f;
    const transformVersion = (flags >> 6) & 0x03;
    let tag;
    if (tagIndex === 0x3f) {
      tag = buf.toString("latin1", pos, pos + 4);
      pos += 4;
    } else {
      tag = KNOWN_TAGS[tagIndex];
      if (!tag) throw new Error(`WOFF2_UNKNOWN_TAG_INDEX: ${tagIndex}`);
    }

    let length;
    [length, pos] = readUIntBase128(buf, pos);
    // glyf と loca は版3が無変換、それ以外のテーブルは版0が無変換。
    const transformed = tag === "glyf" || tag === "loca"
      ? transformVersion !== 3
      : transformVersion !== 0;
    if (transformed) [length, pos] = readUIntBase128(buf, pos);

    if (tag === "cmap") found = { offset, length };
    offset += length;
  }

  if (!found) throw new Error("WOFF2_NO_CMAP");
  return { ...found, dataStart: pos };
}

function codepointsFromFormat4(cmap, start) {
  const covered = new Set();
  const segCount = cmap.readUInt16BE(start + 6) / 2;
  const endBase = start + 14;
  const startBase = endBase + segCount * 2 + 2;
  const deltaBase = startBase + segCount * 2;
  const rangeBase = deltaBase + segCount * 2;

  for (let seg = 0; seg < segCount; seg += 1) {
    const endCode = cmap.readUInt16BE(endBase + seg * 2);
    const startCode = cmap.readUInt16BE(startBase + seg * 2);
    if (startCode > endCode) continue;
    const idDelta = cmap.readInt16BE(deltaBase + seg * 2);
    const idRangeOffset = cmap.readUInt16BE(rangeBase + seg * 2);
    for (let c = startCode; c <= endCode && c !== 0xffff; c += 1) {
      let glyph;
      if (idRangeOffset === 0) {
        glyph = (c + idDelta) & 0xffff;
      } else {
        const at = rangeBase + seg * 2 + idRangeOffset + (c - startCode) * 2;
        if (at + 1 >= cmap.length) continue;
        glyph = cmap.readUInt16BE(at);
        if (glyph !== 0) glyph = (glyph + idDelta) & 0xffff;
      }
      if (glyph !== 0) covered.add(c);
    }
  }
  return covered;
}

function codepointsFromFormat12(cmap, start) {
  const covered = new Set();
  const numGroups = cmap.readUInt32BE(start + 12);
  for (let g = 0; g < numGroups; g += 1) {
    const at = start + 16 + g * 12;
    const startChar = cmap.readUInt32BE(at);
    const endChar = cmap.readUInt32BE(at + 4);
    const startGlyph = cmap.readUInt32BE(at + 8);
    for (let c = startChar; c <= endChar; c += 1) {
      if (startGlyph + (c - startChar) !== 0) covered.add(c);
    }
  }
  return covered;
}

/**
 * @param {Buffer} woff2 フォントファイルの中身
 * @returns {Set<number>} 収録されている符号位置
 */
export function readCodepoints(woff2) {
  const { offset, length, dataStart } = locateCmap(woff2);
  const sfnt = brotliDecompressSync(woff2.subarray(dataStart));
  const cmap = sfnt.subarray(offset, offset + length);

  const numSubtables = cmap.readUInt16BE(2);
  const covered = new Set();
  let read = 0;
  for (let i = 0; i < numSubtables; i += 1) {
    const subtableStart = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(subtableStart);
    if (format === 4) {
      for (const c of codepointsFromFormat4(cmap, subtableStart)) covered.add(c);
      read += 1;
    } else if (format === 12) {
      for (const c of codepointsFromFormat12(cmap, subtableStart)) covered.add(c);
      read += 1;
    }
  }
  if (read === 0) throw new Error("WOFF2_NO_READABLE_CMAP_SUBTABLE");
  return covered;
}
