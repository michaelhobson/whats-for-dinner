import QRCode from "qrcode";

// Dark-on-white, not tinted into the app's orange palette — QR scan
// reliability matters more than color-matching here. The code sits on a
// white tile within the card for contrast/quiet-zone margin instead.
export async function generateQrDataUrl(url: string, sizePx: number): Promise<string> {
  return QRCode.toDataURL(url, {
    width: sizePx,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
  });
}
