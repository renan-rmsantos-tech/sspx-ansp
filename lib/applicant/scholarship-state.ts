import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationDrafts, applications } from "@/lib/db/schema";

/** Solicitação da conta no ano informado ou, sem ano, a mais recente. */
export async function findApplicantApplication(accountId: string, schoolYearId?: string) {
  return db.query.applications.findFirst({
    columns: { id: true, status: true, data_envio: true, school_year_id: true },
    with: {
      school_years: { columns: { nome: true } },
      students: { columns: { nome: true, serie: true } },
    },
    where: schoolYearId
      ? and(eq(applications.applicant_account_id, accountId), eq(applications.school_year_id, schoolYearId))
      : eq(applications.applicant_account_id, accountId),
    orderBy: desc(applications.data_envio),
  });
}

export type ApplicantApplication = NonNullable<Awaited<ReturnType<typeof findApplicantApplication>>>;

export async function findApplicationDraft(accountId: string, schoolYearId: string) {
  return db.query.applicationDrafts.findFirst({
    columns: { data: true, current_step: true, updated_at: true },
    where: and(eq(applicationDrafts.account_id, accountId), eq(applicationDrafts.school_year_id, schoolYearId)),
  });
}
