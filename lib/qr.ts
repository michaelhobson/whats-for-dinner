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
