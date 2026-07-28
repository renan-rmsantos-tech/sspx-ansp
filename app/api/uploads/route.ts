import { NextResponse, type NextRequest } from "next/server";
import { getStorage, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { verifyTicket } from "@/lib/storage/tickets";

export const runtime = "nodejs";

/**
 * Recebe o arquivo enviado pelo formulário público. O acesso é autorizado pelo
 * ticket assinado que a server action `createUploadUrl` emitiu — o caminho de
 * destino vem de dentro do ticket, nunca do corpo da requisição.
 */
export async function PUT(request: NextRequest) {
  const path = verifyTicket(
    request.nextUrl.searchParams.get("ticket"),
    "upload"
  );

  if (!path) {
    return NextResponse.json(
      { error: "Ticket de upload inválido ou expirado." },
      { status: 403 }
    );
  }

  const declared = Number(request.headers.get("content-length") ?? 0);

  if (declared > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Arquivo excede o limite de 10 MB." },
      { status: 413 }
    );
  }

  const body = Buffer.from(await request.arrayBuffer());

  if (body.byteLength === 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  }

  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Arquivo excede o limite de 10 MB." },
      { status: 413 }
    );
  }

  try {
    await getStorage().put(path, body);
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar o arquivo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ path, size: body.byteLength });
}
