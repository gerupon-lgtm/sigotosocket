/**
 * カードの地色にキャラクターが沈まないようにする視認性補助。
 * ココロパレアの方針を踏襲する。
 *
 *   キャラクターを再配色しない。地色も差し替えない。
 *   代わりに「明暗二重の縁取り」「影」「ニュートラル背景プレート」を決定的に適用する。
 *
 * むっくんは茶とクリームの2トーンを持つため、地色によっては
 * 明るい側（顔）か暗い側（針）のどちらかが必ず背景へ溶ける。
 * 二重縁取りは明線と暗線を重ねるので、どちらに転んでも輪郭が残る。
 *
 * 判定はコントラスト比だけで決まる純関数。同じ入力なら常に同じ結果になり、
 * プレビューと保存画像が食い違わない。
 */

export const AID_LEVEL = Object.freeze({
  NONE: "none",       // 地色との差が十分
  OUTLINE: "outline", // 明暗二重の縁取り＋影
  PLATE: "plate",     // 上記＋ニュートラル背景プレート
});

/**
 * 明側・暗側の弱いほうがこの比を下回ったら縁取りを出す。
 * 3.0 は WCAG 2.2 の非テキストコントラスト（1.4.11）に合わせた値。
 */
export const OUTLINE_THRESHOLD = 3.0;
/**
 * 縁取りが必要なとき、強いほうの側がこの比を下回っていたら背景プレートまで出す。
 * 片側だけが弱いなら縁取りで輪郭が立つ。両側とも弱いとキャラ全体が地色へ溶けるので、
 * そこではじめてプレートを敷く。
 */
export const PLATE_THRESHOLD = 2.5;

export function parseColor(value) {
  if (typeof value !== "string") throw new TypeError("COLOR_INVALID");
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new TypeError(`COLOR_INVALID: ${value}`);
  return Object.freeze({
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  });
}

function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG の相対輝度。 */
export function relativeLuminance(color) {
  const { r, g, b } = typeof color === "string" ? parseColor(color) : color;
  return (0.2126 * channelLuminance(r))
    + (0.7152 * channelLuminance(g))
    + (0.0722 * channelLuminance(b));
}

/** WCAG のコントラスト比（1.0〜21.0）。 */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 地色とキャラクターの2トーンから、必要な補助を決める。
 * @param {string} backgroundColor カードの地色
 * @param {{light: string, dark: string}} subjectTones キャラクターの明側・暗側の代表色
 */
export function resolveVisibilityAid(backgroundColor, subjectTones) {
  if (!subjectTones || typeof subjectTones !== "object") {
    throw new TypeError("VISIBILITY_TONES_INVALID");
  }
  const lightContrast = contrastRatio(backgroundColor, subjectTones.light);
  const darkContrast = contrastRatio(backgroundColor, subjectTones.dark);
  const weakest = Math.min(lightContrast, darkContrast);
  const strongest = Math.max(lightContrast, darkContrast);

  const level = weakest >= OUTLINE_THRESHOLD
    ? AID_LEVEL.NONE
    : strongest >= PLATE_THRESHOLD ? AID_LEVEL.OUTLINE : AID_LEVEL.PLATE;

  return Object.freeze({
    level,
    lightContrast,
    darkContrast,
    weakest,
    strongest,
    // 縁取りは常に明暗の2本。地色が明るくても暗くても輪郭が残る。
    outline: level === AID_LEVEL.NONE ? null : Object.freeze({ light: "#ffffff", dark: "#3b4a45" }),
    shadow: level !== AID_LEVEL.NONE,
    // プレートは彩度を持たない中立色。地色の明暗と反対側へ寄せる。
    plateColor: level === AID_LEVEL.PLATE
      ? (relativeLuminance(backgroundColor) > 0.5 ? "#e4e9e6" : "#f7f9f8")
      : null,
  });
}

/** むっくんの代表トーン【想定】。アセット制作後に manifest の実測値で置き換える。 */
export const DEFAULT_SUBJECT_TONES = Object.freeze({ light: "#f2ead8", dark: "#6b563c" });
