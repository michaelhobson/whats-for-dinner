import QRCode from "qrcode";

// High error-correction (level H tolerates ~30% obstruction) so a small
// centered logo mark can sit on top without breaking scans. Colors use the
// app's orange accent rather than plain black — darker end of the palette
// (orange-800) specifically for contrast margin, since scan reliability
// matters more here than an exact color match.
const QR_DARK = "#9a3412";
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
      const markSize = Math.round(sizePx * 0.22);
      const cx = sizePx / 2;
      const cy = sizePx / 2;

      // White circular backdrop so the mark reads clearly against the modules.
      ctx.fillStyle = QR_LIGHT;
      ctx.beginPath();
      ctx.arc(cx, cy, markSize / 2 + 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${markSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🍽️", cx, cy + 2);
    }
  }

  return canvas.toDataURL("image/png");
}
