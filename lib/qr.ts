import QRCode from "qrcode";

// High error-correction (level H tolerates ~30% obstruction) so a small
// centered logo mark can sit on top without breaking scans. Dark modules use
// the app's brighter primary accent (orange-600, same as its main buttons)
// per explicit request — if this scans unreliably, drop back to a darker
// shade (e.g. orange-800 "#9a3412") for more contrast margin.
const QR_DARK = "#ea580c";
const QR_LIGHT = "#ffffff";

export async function generateQrDataUrl(
  url: string,
  sizePx: number,
  options?: { embedLogo?: boolean }
): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    width: sizePx,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: QR_DARK, light: QR_LIGHT },
  });

  if (options?.embedLogo !== false) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Center against the canvas's ACTUAL final pixel dimensions, not the
      // requested sizePx — the qrcode library's own width/margin/scale math
      // (see getImageWidth in its renderer) floors to a computed size that
      // isn't guaranteed to exactly equal what was asked for.
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const markSize = Math.round(Math.min(w, h) * 0.22);

      // White circular backdrop so the mark reads clearly against the modules.
      ctx.fillStyle = QR_LIGHT;
      ctx.beginPath();
      ctx.arc(cx, cy, markSize / 2 + 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${markSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // textAlign/textBaseline center the glyph's ADVANCE box, not its
      // visible ink — and different platforms' built-in emoji fonts (Apple
      // Color Emoji, Noto Color Emoji, Segoe UI Emoji) bake different
      // internal padding into the same codepoint, so the gap between those
      // two varies by device. Measuring the actual rendered bounding box and
      // compensating is what makes this land correctly everywhere, rather
      // than happening to look right on whichever font was tested against.
      const metrics = ctx.measureText("🍽️");
      const boxLeft = metrics.actualBoundingBoxLeft ?? markSize / 2;
      const boxRight = metrics.actualBoundingBoxRight ?? markSize / 2;
      const boxAscent = metrics.actualBoundingBoxAscent ?? markSize / 2;
      const boxDescent = metrics.actualBoundingBoxDescent ?? markSize / 2;
      const offsetX = (boxLeft - boxRight) / 2;
      const offsetY = (boxAscent - boxDescent) / 2;

      ctx.fillText("🍽️", cx + offsetX, cy + offsetY);
    }
  }

  return canvas.toDataURL("image/png");
}
