import { NextResponse, type NextRequest } from "next/server";
import { getStorage, guessMimeType } from "@/lib/storage";
import { verifyTicket } from "@/lib/storage/tickets";

export const runtime = "nodejs";

/**
 * Entrega um documento enviado na solicitação. Só o painel admin emite o
 * ticket (via `getDocumentUrl`), e ele expira em 5 minutos — equivalente às
 * signed URLs de download que o Supabase Storage gerava.
 */
export async function GET(request: NextRequest) {
  const path = verifyTicket(
    request.nextUrl.searchParams.get("ticket"),
    "download"
  );

  if (!path) {
    return NextResponse.json(
      { error: "Ticket de download inválido ou expirado." },
      { status: 403 }
    );
  }

  const body = await getStorage().get(path);

  if (!body) {
    return NextResponse.json(
      { error: "Documento não encontrado." },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": guessMimeType(path),
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        path.split("/").pop() || "documento"
      )}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
