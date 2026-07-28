import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check usado pelo hook de deploy (`deploy.healthUrl`): valida o
 * caminho inteiro Traefik -> aplicação -> Postgres, não só "o container subiu".
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: "ok", database: "ok" });
}
