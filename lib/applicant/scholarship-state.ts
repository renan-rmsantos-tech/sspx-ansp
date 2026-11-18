import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationDrafts, applications, documentRequests } from "@/lib/db/schema";

/** Solicitação da conta no ano informado ou, sem ano, a mais recente. */
export async function findApplicantApplication(accountId: string, schoolYearId?: string) {
  return db.query.applications.findFirst({
    columns: { id: true, status: true, data_envio: true, school_year_id: true },
    with: {
      school_years: { columns: { nome: true } },
      students: { columns: { nome: true, serie: true } },
      document_requests: {
        columns: { id: true, categoria: true, motivo: true, status: true, created_at: true, resubmitted_at: true },
        with: { student: { columns: { nome: true } } },
        where: ne(documentRequests.status, "cancelada"),
        orderBy: asc(documentRequests.created_at),
      },
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
