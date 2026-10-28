import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PIX_DETAILS } from "@/lib/data/pix-details";
import { SEAL_DATA_URI } from "@/lib/pdf/seal-image";
import { DOCUMENT_HEADER_SEAL_CID } from "./donor-welcome-template";
import { DONOR_PIX_QR_CID } from "./donor-payment-details";

/** Call with the frozen HTML and seal flag on retries, never current settings. */
export function institutionalEmailAttachments(html: string, includeSeal: boolean) {
  const attachments = [];
  if (includeSeal) attachments.push({
    filename: "selo-ansp.png",
    content: Buffer.from(SEAL_DATA_URI.slice(SEAL_DATA_URI.indexOf(",") + 1), "base64"),
    contentId: DOCUMENT_HEADER_SEAL_CID,
    contentType: "image/png",
  });
  if (html.includes(`src="cid:${DONOR_PIX_QR_CID}"`)) attachments.push({
    filename: "pix-acipec.png",
    content: readFileSync(join(process.cwd(), "public", PIX_DETAILS.qrCode)),
    contentId: DONOR_PIX_QR_CID,
    contentType: "image/png",
  });
  return attachments.length ? attachments : undefined;
}
