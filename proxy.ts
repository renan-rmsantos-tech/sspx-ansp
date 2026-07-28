import { getIronSession } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { sessionOptions, type SessionData } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return response;
  }

  let authenticated = false;

  try {
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions()
    );
    authenticated = Boolean(session.userId);
  } catch {
    // SESSION_SECRET ausente ou cookie corrompido: trata como não autenticado.
    authenticated = false;
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
