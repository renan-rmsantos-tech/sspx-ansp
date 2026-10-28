import { MAX_UPLOAD_BYTES } from "@/lib/storage";

export type ReceiptMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";

const EXTENSION: Record<ReceiptMime, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf",
};

function detectedMime(body: Buffer): ReceiptMime | null {
  if (body.length >= 4 && body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) &&
      body.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) return "image/jpeg";
  if (body.length >= 20 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      body.subarray(-8, -4).toString("ascii") === "IEND") return "image/png";
  if (body.length >= 16 && body.toString("ascii", 0, 4) === "RIFF" &&
      body.toString("ascii", 8, 12) === "WEBP" && body.readUInt32LE(4) === body.length - 8) return "image/webp";
  if (body.length >= 14 && ["GIF87a", "GIF89a"].includes(body.toString("ascii", 0, 6)) &&
      body[body.length - 1] === 0x3b) return "image/gif";
  if (body.length >= 8 && body.toString("ascii", 0, 5) === "%PDF-" &&
      body.subarray(-1024).includes(Buffer.from("%%EOF"))) return "application/pdf";
  return null;
}

export function validateReceiptFile(body: Buffer, declaredMime: string, originalName: string):
  | { ok: true; mime: ReceiptMime; name: string }
  | { ok: false; reason: "empty" | "too_large" | "type" } {
  if (body.length === 0) return { ok: false, reason: "empty" };
  if (body.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  const mime = detectedMime(body);
  if (!mime || mime !== declaredMime) return { ok: false, reason: "type" };
  const base = originalName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 80)
    .replace(/\.[^.]*$/, "") || "comprovante";
  return { ok: true, mime, name: `${base}.${EXTENSION[mime]}` };
}
