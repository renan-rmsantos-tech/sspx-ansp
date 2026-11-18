import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Liga à conta as solicitações enviadas antes das contas de solicitante com o
 * mesmo e-mail. Só deve ser chamada depois que a posse do e-mail foi provada
 * (confirmação, nova senha ou login de conta confirmada).
 *
 * Fica uma solicitação por ano letivo, a mais recente, e nunca toma o lugar de
 * uma que a conta já tenha naquele ano. Uma falha aqui não impede o login.
 */
export async function linkLegacyApplications(accountId: string, email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  try {
    const rows = await db.execute<{ id: string }>(sql`
      update applications
      set applicant_account_id = ${accountId}
      where id in (
        select distinct on (legacy.school_year_id) legacy.id
        from applications legacy
        where legacy.applicant_account_id is null
          and lower(btrim(legacy.email)) = ${normalized}
          and not exists (
            select 1 from applications own
            where own.applicant_account_id = ${accountId}
              and own.school_year_id = legacy.school_year_id
          )
        order by legacy.school_year_id, legacy.data_envio desc
      )
        and applicant_account_id is null
      returning id
    `);
    return rows.length;
  } catch (error) {
    console.error("[linkLegacyApplications] falha:", error instanceof Error ? error.message : error);
    return 0;
  }
}
