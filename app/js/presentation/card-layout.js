/**
 * 結果カードの座標と寸法。**ここが正典で、描画側に数値を直書きしない。**
 * 根拠と決定の経緯は docs/brand/card-layout.md。
 *
 * 決め方：
 *   - 文字サイズは幅1080に対する係数（ココロパレアの実装値を出発点にした）
 *   - ヘッダーは上端から、下部は下端からの距離で置く。高さを変えても動かない
 *   - 中央（キャラクター＋レーダー）は、その2つに挟まれた残りを使う
 */

export const CARD = Object.freeze({ width: 1080, height: 1800 });

/** カードに載る固定文言。描画側とテストで同じものを見る。 */
export const TEXT = Object.freeze({
  appName: "シゴトソケット",
  appSubtitle: "〜ORVIS 自己理解支援ツール〜",
  titlePill: "あなたの称号",
  note1: "ORVIS（IPIP収録・パブリックドメイン）に基づく参考ツールです",
  note2: "医学的・心理学的な診断ではありません",
  footerPill: "45問 詳細結果",
  characterPending: "キャラクター画像は準備中です",
});
const W = CARD.width, H = CARD.height, CX = W / 2;

/** 下端からの距離で置くもの */
const FROM_BOTTOM = Object.freeze({
  note1: 130, note2: 110, pillTop: 97, pillBottom: 63, pillText: 72, version: 44,
});
const B = (key) => H - FROM_BOTTOM[key];

/**
 * ヘッダー〜称号の塊を、確定値からさらに下へずらす量。
 * 上の枠との間隔が詰まって見えるため（2026-09-05 本人指摘）。
 * **個々のyを書き換えず、ここ1か所で動かす。**
 */
const HEADER_DROP = 18;

export const LAYOUT = Object.freeze({
  palette: Object.freeze({
    background: "#f4f6fa",
    ink: "#1b2a44",
    sub: "#4a5b7a",
    line: "#ccd6e4",
    frameOuter: "rgba(27, 42, 68, 0.22)",
    frameInner: "rgba(27, 42, 68, 0.12)",
    surface: "rgba(255, 255, 255, 0.9)",
    dot: "rgba(47, 84, 134, 0.72)",
  }),

  frame: Object.freeze({
    outer: Object.freeze({ x: 18, y: 18, w: W - 36, h: H - 36, r: 46, lineWidth: 3 }),
    inner: Object.freeze({ x: 28, y: 28, w: W - 56, h: H - 56, r: 38, lineWidth: 2 }),
  }),

  header: Object.freeze({
    markSize: 94,
    markTop: 61.9 + HEADER_DROP,
    gap: 22,
    nameSize: 48,
    nameBaseline: 111.9 + HEADER_DROP,
    subtitleSize: 23,
    subtitleBaseline: 148.4 + HEADER_DROP,
    // アプリ名の幅の下限。副題がこれより狭ければ字間を詰めない
    nameMinWidth: 360,
    divider: Object.freeze({ y: 167.9 + HEADER_DROP, left: [300, 488], right: [592, 780], dotRadius: 5 }),
  }),

  title: Object.freeze({
    pill: Object.freeze({ x: (W - 344) / 2, y: 192.2 + HEADER_DROP, w: 344, h: 52, r: 26 }),
    pillTextSize: 27,
    pillTextBaseline: 227.3 + HEADER_DROP,
    baseline: 305.6 + HEADER_DROP,
    size: 47,          // 比率90%（52 × 0.9）
    minSize: 34,       // 自動縮小の下限
    maxWidth: 890,
    neutralSize: 29,
    neutralBaseline: 350.1 + HEADER_DROP,
  }),

  /** キャラクターとレーダーが入る帯 */
  middle: Object.freeze({ top: 360, bottom: B("note1") - 15 - 16 - 100 - 22 - 42 - 30 - 60 }),

  character: Object.freeze({
    size: 380,
    topGap: 60,        // middle.top からの空き
    prop: Object.freeze({ size: 210, offsetX: 60, haloBlur: 6, haloPasses: 3, haloColor: "#ffffff" }),
  }),

  /**
   * ゲスト出演の猫（F-022）。連携済みのときだけ描く。
   * **実体（透明余白を除いた矩形）どうしで並べる。**箱で並べると、余白の量が違うぶん
   * 見た目の隙間がポーズごとに変わる。
   */
  guest: Object.freeze({
    ratio: 0.75,   // むっくんの高さに対する猫の高さ
    gap: 6,        // 実体どうしの隙間。**0以上にすること**（負にすると重なる）
    lift: 34,      // 接地線を上げる量。奥に居るように見せる
    // 2体並ぶときの小物。単体のときより小さくし、むっくんへ寄せる
    prop: Object.freeze({ scale: 0.8, overlap: 0.45 }),
  }),

  radar: Object.freeze({
    radius: 240,
    labelGap: 34,
    labelSize: 26,
    downFromMiddleBottom: 30,   // 下端をこれだけ下げる
    gridColor: "#9aabc4",
    labelColor: "#4a5b7a",
    fillColor: "rgba(47, 84, 134, 0.24)",
    strokeColor: "#2f5486",
    strokeWidth: 3,
  }),

  /** 上位2領域とホランド型。1つの塊として扱う */
  conclusion: Object.freeze({
    top2Size: 30,
    top2Bold: true,
    hollandSize: 26,
    gapBetween: 42,
    gapAbove: 60,
  }),

  /** 第2フェーズのバッジ・相手称号名のために空けてある。MVPでは何も描かない */
  reservedBand: Object.freeze({ x: 140, w: 800, h: 100 }),

  footer: Object.freeze({
    noteSize: 15,
    note1Baseline: B("note1"),
    note2Baseline: B("note2"),
    pill: Object.freeze({ x: 382, y: B("pillTop"), w: 316, h: 34, r: 17 }),
    pillTextSize: 24,
    pillTextBaseline: B("pillText"),
    versionSize: 13,
    versionBaseline: B("version"),
    versionAlpha: 0.72,
  }),
});

/**
 * ヘッダーの横位置。マーク＋アプリ名＋副題を1つの塊として中央へ置く。
 * アプリ名は副題の幅（上限 nameMinWidth）まで字間を広げる。
 * @param {(text: string, size: number) => number} measure 文字幅を返す関数
 */
export function headerLockup(measure) {
  const h = LAYOUT.header;
  const subtitleWidth = measure(TEXT.appSubtitle, h.subtitleSize);
  const nameNatural = measure(TEXT.appName, h.nameSize);
  const nameWidth = Math.max(nameNatural, Math.min(h.nameMinWidth, subtitleWidth));
  const groupWidth = h.markSize + h.gap + nameWidth;
  const groupX = (CARD.width - groupWidth) / 2;
  return Object.freeze({
    groupX, groupWidth, nameWidth, subtitleWidth,
    textX: groupX + h.markSize + h.gap,
    markRight: groupX + h.markSize,
  });
}

/** 下から順に決まる縦位置を算出する */
export function verticalPlan() {
  const { middle, conclusion, reservedBand, footer, character, radar } = LAYOUT;
  const bandTop = footer.note1Baseline - footer.noteSize - 16 - reservedBand.h;
  const hollandBaseline = bandTop - 22;
  const top2Baseline = hollandBaseline - conclusion.gapBetween;
  const charTop = middle.top + character.topGap;
  const chartHeight = radar.radius * 2 + radar.labelGap * 2;
  const chartTop = middle.bottom + radar.downFromMiddleBottom - chartHeight;
  return Object.freeze({
    charTop,
    charBottom: charTop + character.size,
    chartTop,
    radarCenterY: chartTop + chartHeight / 2,
    chartBottom: chartTop + chartHeight,
    bandTop,
    top2Baseline,
    hollandBaseline,
    centerX: CX,
  });
}
