import { NextResponse, type NextRequest } from "next/server";
import { attachDonorReceipt } from "@/lib/donor-receipts/service";
import { verifyDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import {
  checkReceiptThrottle, checkReceiptTicketThrottle, enterReceiptUpload, leaveReceiptUpload, receiptSourceIp,
} from "@/lib/donor-receipts/throttle";
import { MAX_UPLOAD_BYTES } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;
const SAFE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function response(error: string, status: number, retryAfter?: number) {
  return NextResponse.json({ error }, {
    status,
    headers: { ...SAFE_HEADERS, ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
  });
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin) return false;
    if (process.env.NODE_ENV === "production") {
      const hosts = [process.env.APP_HOST, process.env.APP_HOST_WWW, process.env.APP_HOST_LEGACY].filter(Boolean);
      return parsed.protocol === "https:" && hosts.includes(parsed.hostname) && !parsed.port &&
        parsed.host === request.headers.get("host");
    }
    return parsed.origin === request.nextUrl.origin;
  } catch { return false; }
}

async function boundedBody(request: NextRequest): Promise<Buffer | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest) {
  const ip = receiptSourceIp(request.headers);
  if (!sameOrigin(request)) return response("Solicitação inválida.", 403);
  const ipWait = checkReceiptThrottle("post", ip);
  if (ipWait) return response("Muitas solicitações. Tente novamente.", 429, ipWait);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) return response("Envie um arquivo.", 400);
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    return response("Arquivo excede o limite de 10 MB.", 413);
  }
  if (!enterReceiptUpload()) return response("Muitas solicitações. Tente novamente.", 429, 5);
  try {
    const body = await boundedBody(request);
    if (!body) return response("Arquivo excede o limite de 10 MB.", 413);
    let form: FormData;
    try {
      form = await new Request("https://receipt.local/", {
        method: "POST", headers: { "content-type": contentType }, body: new Uint8Array(body),
      }).formData();
    } catch { return response("Envie um arquivo válido.", 400); }
    const ticket = form.get("ticket");
    const bearer = typeof ticket === "string" ? ticket : null;
    const validTicket = verifyDonorReceiptTicket(bearer);
    const wait = validTicket ? checkReceiptTicketThrottle(bearer!) : checkReceiptThrottle("invalid", ip);
    if (wait) return response("Muitas solicitações. Tente novamente.", 429, wait);
    if (!validTicket) return response("Link inválido ou expirado.", 403);
    const file = form.get("file");
    if (!(file instanceof File)) return response("Envie um arquivo válido.", 400);
    if (file.size > MAX_UPLOAD_BYTES) return response("Arquivo excede o limite de 10 MB.", 413);
    const result = await attachDonorReceipt(bearer, {
      body: Buffer.from(await file.arrayBuffer()), mime: file.type, name: file.name,
    });
    switch (result.status) {
      case "saved":
        return NextResponse.json({ message: "Comprovante enviado. A confirmação do pagamento depende da conferência bancária." },
          { headers: SAFE_HEADERS });
      case "invalid": return response("Link inválido ou expirado.", 403);
      case "too_large": return response("Arquivo excede o limite de 10 MB.", 413);
      case "file": return response("Envie uma imagem ou PDF válido.", 400);
      case "conflict": return response("Não foi possível salvar agora. Tente novamente.", 409);
      case "error": return response("Não foi possível salvar agora. Tente novamente.", 500);
    }
  } catch {
    return response("Não foi possível salvar agora. Tente novamente.", 500);
  } finally { leaveReceiptUpload(); }
}
