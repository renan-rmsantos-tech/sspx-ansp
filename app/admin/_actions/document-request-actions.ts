"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { sendDocumentRequestEmail } from "@/lib/applicant/account-emails";
import {
  documentLabel,
  MAX_REQUEST_REASON,
  REQUESTABLE_CATEGORIES,
  STUDENT_CATEGORIES,
} from "@/lib/applicant/document-labels";
import { requireCapability, type StaffIdentity } from "@/lib/auth/authorization";
import { BYPASS_USER, isAuthBypass } from "@/lib/auth/bypass";
import { db } from "@/lib/db";
import { applicantAccounts, applications, documentRequests, type DocumentRequestStatus } from "@/lib/db/schema";

export interface DocumentRequestView {
  id: string;
  categoria: string;
  student_id: string | null;
  label: string;
  motivo: string;
  status: DocumentRequestStatus;
  created_at: string;
  notified_at: string | null;
  resubmitted_at: string | null;
  resolved_at: string | null;
  documents: Array<{
    id: string;
    categoria: string;
    nome_arquivo: string;
    storage_path: string;
    mime_type: string;
    application_id: string;
  }>;
}

export interface DocumentRequestsData {
  /** E-mail da conta que enviou a solicitação; nulo nas anteriores às contas. */
  accountEmail: string | null;
  requests: DocumentRequestView[];
}

type Result<T = undefined> = { success: true; data?: T; emailSent?: boolean } | { success: false; error: string };

const NOT_FOUND = "Solicitação não encontrada.";
const NO_ACCOUNT =
  "Esta solicitação foi enviada antes das contas de solicitante e a família ainda não criou a conta. Peça o documento por telefone ou e-mail.";

/** O usuário fictício do AUTH_BYPASS não existe em admin_users. */
function actorId(staff: StaffIdentity): string | null {
  return isAuthBypass() && staff.id === BYPASS_USER.id ? null : staff.id;
}

async function loadApplication(applicationId: string) {
  return db.query.applications.findFirst({
    columns: { id: true, applicant_account_id: true },
    with: { students: { columns: { id: true, nome: true } } },
    where: eq(applications.id, applicationId),
  });
}

async function accountEmail(accountId: string | null): Promise<string | null> {
  if (!accountId) return null;
  const account = await db.query.applicantAccounts.findFirst({
    columns: { email: true },
    where: eq(applicantAccounts.id, accountId),
  });
  return account?.email ?? null;
}

async function listRequests(applicationId: string): Promise<DocumentRequestView[]> {
  const rows = await db.query.documentRequests.findMany({
    with: {
      student: { columns: { nome: true } },
      documents: {
        columns: { id: true, categoria: true, nome_arquivo: true, storage_path: true, mime_type: true, application_id: true },
      },
    },
    where: eq(documentRequests.application_id, applicationId),
    orderBy: asc(documentRequests.created_at),
  });
  return rows.map((row) => ({
    id: row.id,
    categoria: row.categoria,
    student_id: row.student_id,
    label: documentLabel(row.categoria, row.student?.nome),
    motivo: row.motivo,
    status: row.status,
    created_at: row.created_at,
    notified_at: row.notified_at,
    resubmitted_at: row.resubmitted_at,
    resolved_at: row.resolved_at,
    documents: row.documents,
  }));
}

/**
 * Envia à família um único e-mail com todas as pendências abertas e marca o
 * aviso nelas. Uma falha de envio não desfaz as pendências: o painel mostra
 * que o aviso não saiu e permite reenviar.
 */
async function notifyOpenRequests(applicationId: string, email: string): Promise<boolean> {
  const open = (await listRequests(applicationId)).filter((request) => request.status === "aberta");
  if (open.length === 0) return false;
  try {
    await sendDocumentRequestEmail(
      email,
      open.map((request) => ({ label: request.label, motivo: request.motivo }))
    );
  } catch (error) {
    console.error("[documentRequests] falha ao avisar a família:", error instanceof Error ? error.message : error);
    return false;
  }
  await db
    .update(documentRequests)
    .set({ notified_at: new Date().toISOString() })
    .where(inArray(documentRequests.id, open.map((request) => request.id)));
  return true;
}

export async function getDocumentRequests(applicationId: string): Promise<Result<DocumentRequestsData>> {
  await requireCapability("applications:documents");
  try {
    const application = await loadApplication(applicationId);
    if (!application) return { success: false, error: NOT_FOUND };
    return {
      success: true,
      data: { accountEmail: await accountEmail(application.applicant_account_id), requests: await listRequests(applicationId) },
    };
  } catch {
    return { success: false, error: "Erro ao carregar as pendências." };
  }
}

export async function createDocumentRequest(
  applicationId: string,
  input: { categoria: string; student_id?: string | null; motivo: string }
): Promise<Result<DocumentRequestsData>> {
  const staff = await requireCapability("applications:documents");
  const motivo = (input.motivo ?? "").trim();
  if (!(REQUESTABLE_CATEGORIES as readonly string[]).includes(input.categoria)) {
    return { success: false, error: "Escolha o documento que a família deve reenviar." };
  }
  if (!motivo) return { success: false, error: "Explique à família o que precisa ser corrigido." };
  if (motivo.length > MAX_REQUEST_REASON) {
    return { success: false, error: `Use no máximo ${MAX_REQUEST_REASON} caracteres no motivo.` };
  }

  try {
    const application = await loadApplication(applicationId);
    if (!application) return { success: false, error: NOT_FOUND };
    const email = await accountEmail(application.applicant_account_id);
    if (!email) return { success: false, error: NO_ACCOUNT };

    let studentId: string | null = null;
    if (STUDENT_CATEGORIES.has(input.categoria)) {
      const student = application.students.find((candidate) => candidate.id === input.student_id);
      if (!student) return { success: false, error: "Escolha o aluno deste documento." };
      studentId = student.id;
    }

    await db.insert(documentRequests).values({
      application_id: applicationId,
      categoria: input.categoria,
      student_id: studentId,
      motivo,
      created_by: actorId(staff),
    });

    const emailSent = await notifyOpenRequests(applicationId, email);
    return { success: true, emailSent, data: { accountEmail: email, requests: await listRequests(applicationId) } };
  } catch (error) {
    console.error("[createDocumentRequest] falha:", error instanceof Error ? error.message : error);
    return { success: false, error: "Não foi possível registrar a pendência." };
  }
}

export async function resendDocumentRequestNotice(applicationId: string): Promise<Result<DocumentRequestsData>> {
  await requireCapability("applications:documents");
  try {
    const application = await loadApplication(applicationId);
    if (!application) return { success: false, error: NOT_FOUND };
    const email = await accountEmail(application.applicant_account_id);
    if (!email) return { success: false, error: NO_ACCOUNT };
    const emailSent = await notifyOpenRequests(applicationId, email);
    if (!emailSent) return { success: false, error: "Não foi possível enviar o aviso agora. Tente novamente em alguns minutos." };
    return { success: true, emailSent, data: { accountEmail: email, requests: await listRequests(applicationId) } };
  } catch {
    return { success: false, error: "Não foi possível enviar o aviso." };
  }
}

async function closeRequest(
  applicationId: string,
  requestId: string,
  from: DocumentRequestStatus[],
  to: "resolvida" | "cancelada"
): Promise<Result<DocumentRequestsData>> {
  const staff = await requireCapability("applications:documents");
  try {
    const [changed] = await db
      .update(documentRequests)
      .set({ status: to, resolved_at: new Date().toISOString(), resolved_by: actorId(staff) })
      .where(
        and(
          eq(documentRequests.id, requestId),
          eq(documentRequests.application_id, applicationId),
          inArray(documentRequests.status, from)
        )
      )
      .returning({ id: documentRequests.id });
    if (!changed) return { success: false, error: "Esta pendência já foi atualizada. Recarregue a página." };
    const application = await loadApplication(applicationId);
    return {
      success: true,
      data: {
        accountEmail: await accountEmail(application?.applicant_account_id ?? null),
        requests: await listRequests(applicationId),
      },
    };
  } catch {
    return { success: false, error: "Não foi possível atualizar a pendência." };
  }
}

/** Confirma o documento reenviado pela família. */
export async function resolveDocumentRequest(applicationId: string, requestId: string) {
  return closeRequest(applicationId, requestId, ["reenviada", "aberta"], "resolvida");
}

/** Retira um pedido feito por engano, antes de a família reenviar. */
export async function cancelDocumentRequest(applicationId: string, requestId: string) {
  return closeRequest(applicationId, requestId, ["aberta"], "cancelada");
}
