import sharp from "sharp";
const labels = ["A  #f4f6fa（現行・うっすら青）", "B  #ffffff（白）", "C  #fbfaf7（うっすら温白）"];
const files = ["/tmp/bg_a.png", "/tmp/bg_b.png", "/tmp/bg_c.png"];
const w = 380, h = 475, gap = 22, W = w * 3 + gap * 4, H = h + 80;
const cards = await Promise.all(files.map((f) => sharp(f).resize(w, h).png().toBuffer()));
async function sheet(bg, ink, out) {
  const txt = labels.map((s, i) =>
    `<text x="${gap + i * (w + gap) + w / 2}" y="38" font-family="Noto Sans CJK JP" font-size="20" fill="${ink}" text-anchor="middle">${s}</text>`).join("");
  const base = await sharp({ create: { width: W, height: H, channels: 4, background: bg } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${txt}</svg>`), top: 0, left: 0 }])
    .png().toBuffer();
  await sharp(base).composite(cards.map((b, i) => ({ input: b, left: gap + i * (w + gap), top: 58 }))).png().toFile(out);
}
await sheet("#ffffff", "#1b2a44", "docs/brand/card/地色比較_白背景.png");
await sheet("#15202b", "#e6ecf0", "docs/brand/card/地色比較_暗背景.png");
console.log("ok");
