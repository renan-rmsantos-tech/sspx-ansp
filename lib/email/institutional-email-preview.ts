import { PIX_DETAILS } from "@/lib/data/pix-details";
import { SEAL_DATA_URI } from "@/lib/pdf/seal-image";
import { DOCUMENT_HEADER_SEAL_CID } from "./donor-welcome-template";
import { DONOR_PIX_QR_CID } from "./donor-payment-details";

/** Browser-safe: display the same markup with browser-resolvable image sources. */
export function institutionalEmailPreviewHtml(html: string) {
  return html
    .replaceAll(`cid:${DOCUMENT_HEADER_SEAL_CID}`, SEAL_DATA_URI)
    .replaceAll(`cid:${DONOR_PIX_QR_CID}`, PIX_DETAILS.qrCode);
}
