"use server";

import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { loadDocumentHeader, persistDocumentHeader, HEADER_LOAD_ERROR } from "@/lib/documents/document-header-store";
import type { DocumentHeaderData } from "@/lib/documents/document-header";
import { z } from "zod";
import {
  requireAdmin,
  requireCapability,
  type StaffIdentity,
} from "@/lib/auth/authorization";
import { BYPASS_USER, isAuthBypass } from "@/lib/auth/bypass";
import { db } from "@/lib/db";
import { nextOccurrence, occurrenceForMonth } from "@/lib/donor-recurrence";
import { dueSnapshotDecision, monthlyReceiptState } from "@/lib/donor-payment-ledger";
import { saoPauloDate } from "@/lib/donor-recurrence";
import {
  applications,
  adminUsers,
  contractTemplates,
  decisionTemplates,
  donorPaymentLedger,
  donorMonthlyInstructionSends,
  donorPledges,
  donorReminderSends,
  schoolYears,
} from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { createTicket } from "@/lib/storage/tickets";
import {
  formatDataExtenso,
  replaceContractTokens,
  type ContractClause,
  type ContractTokenData,
} from "@/lib/templates/contract-tokens";
import { replaceTokens, type TokenData } from "@/lib/templates/token-replacer";
import { findIssuedDocument, listCurrentIssuedDocuments, listIssuedDocumentHistory, persistIssuedDocument } from "@/lib/documents/issued-documents";

type ActionResult = { success: boolean; error?: string };

const DOCUMENT_TICKET_TTL_SECONDS = 300;

function resolveDecidedBy(userId: string): string | null {
  // O bypass usa um UUID de fachada que não existe em admin_users.
  if (isAuthBypass() && userId === BYPASS_USER.id) {
    return null;
  }
  return userId;
}

async function requireAuth(): Promise<{ user: StaffIdentity }> {
  return { user: await requireAdmin() };
}

async function issuanceActorId(user: StaffIdentity): Promise<string | null> {
  if (!isAuthBypass() || user.id !== BYPASS_USER.id) return user.id;
  const actor = await db.query.adminUsers.findFirst({
    columns: { id: true },
    where: eq(adminUsers.role, "admin"),
  });
  return actor?.id ?? null;
}

// --- Applications ---

export async function getApplications(
  filter?: "pendente" | "aprovada" | "rejeitada"
) {
  const user = await requireCapability("applications:read-operational");

  try {
    if (user.role === "secretaria") {
      const data = await db.query.applications.findMany({
        columns: {
          id: true,
          status: true,
          escola: true,
          pai_nome: true,
          mae_nome: true,
          telefone: true,
          email: true,
          data_decisao: true,
        },
        with: { students: { columns: { id: true, nome: true } } },
        where: filter ? eq(applications.status, filter) : undefined,
        orderBy: desc(applications.data_envio),
      });

      return { data, error: null };
    }

    const data = await db.query.applications.findMany({
      with: { students: true },
      where: filter ? eq(applications.status, filter) : undefined,
      orderBy: desc(applications.data_envio),
    });

    return { data, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar solicitações." };
  }
}

export async function getApplicationDetail(id: string) {
  await requireAuth();

  try {
    const application = await db.query.applications.findFirst({
      where: eq(applications.id, id),
      with: {
        students: true,
        other_children: true,
        vehicles: true,
        collaboration: true,
        benefactors: true,
        documents: true,
      },
    });

    if (!application) {
      return { data: null, error: "Solicitação não encontrada." };
    }

    return {
      data: { ...application, collaboration: application.collaboration ?? null },
      error: null,
    };
  } catch {
    return { data: null, error: "Solicitação não encontrada." };
  }
}

// --- Donor Pledges ---

export async function getDonorPledges() {
  const user = await requireCapability("donors:read-operational");

  try {
    if (user.role === "secretaria") {
      const data = await db.query.donorPledges.findMany({
        columns: {
          id: true,
          nome: true,
          email: true,
          frequencia: true,
          duracao: true,
          valor: true,
          meio_pagamento: true,
          data_pagamento: true,
          lembrete_canal: true,
          telefone: true,
          priorado_capela: true,
          observacoes: true,
          created_at: true,
        },
        orderBy: desc(donorPledges.created_at),
      });
      return { data, error: null };
    }

    const rows = await db.query.donorPledges.findMany({
      orderBy: desc(donorPledges.created_at),
    });

    const monthlyIds = rows
      .filter((row) => row.frequencia === "mensal")
      .map((row) => row.id);
    const reminderRows = monthlyIds.length
      ? await db.query.donorReminderSends.findMany({
          columns: {
            pledge_id: true,
            kind: true,
            competencia: true,
            status: true,
            sent_at: true,
            error_code: true,
          },
          where: inArray(donorReminderSends.pledge_id, monthlyIds),
          orderBy: [
            desc(donorReminderSends.updated_at),
            desc(donorReminderSends.created_at),
          ],
        })
      : [];
    const latestReminderByPledge = new Map<string, (typeof reminderRows)[number]>();
    for (const reminder of reminderRows) {
      if (!latestReminderByPledge.has(reminder.pledge_id)) {
        latestReminderByPledge.set(reminder.pledge_id, reminder);
      }
    }

    const [instructionRows, ledgerRows] = monthlyIds.length
      ? await Promise.all([
          db.query.donorMonthlyInstructionSends.findMany({
            columns: {
              pledge_id: true, generation: true, receipt_competencia: true,
              status: true, sent_at: true, error_code: true,
              reservation_expires_at: true, provider_call_started_at: true,
            },
            where: inArray(donorMonthlyInstructionSends.pledge_id, monthlyIds),
            orderBy: desc(donorMonthlyInstructionSends.generation),
          }),
          db.query.donorPaymentLedger.findMany({
            columns: {
              pledge_id: true, competencia: true, due_date: true,
              receipt_path: true, receipt_name: true, receipt_uploaded_at: true,
            },
            where: inArray(donorPaymentLedger.pledge_id, monthlyIds),
            orderBy: asc(donorPaymentLedger.competencia),
          }),
        ])
      : [[], []];
    const latestInstructionsByPledge = new Map<string, (typeof instructionRows)[number]>();
    for (const attempt of instructionRows) {
      if (!latestInstructionsByPledge.has(attempt.pledge_id)) {
        latestInstructionsByPledge.set(attempt.pledge_id, attempt);
      }
    }
    const ledgerByPledge = new Map<string, (typeof ledgerRows)>();
    for (const ledger of ledgerRows) {
      const rows = ledgerByPledge.get(ledger.pledge_id) ?? [];
      rows.push(ledger);
      ledgerByPledge.set(ledger.pledge_id, rows);
    }

    const nowDate = new Date();
    const now = nowDate.getTime();
    const currentMonth = saoPauloDate(nowDate).slice(0, 7);
    const data = rows.map((row) => {
      const latest = latestReminderByPledge.get(row.id);
      const instructions = latestInstructionsByPledge.get(row.id);
      const ledger = ledgerByPledge.get(row.id) ?? [];
      const displayOccurrence = row.frequencia === "mensal"
        ? occurrenceForMonth(row, currentMonth) ?? nextOccurrence(row, nowDate)
        : null;
      const currentLedger = displayOccurrence
        ? ledger.find((item) => item.competencia === displayOccurrence.competence)
        : undefined;
      const {
        welcome_email_reservation_token: reservationToken,
        welcome_email_reservation_expires_at: reservationExpiresAt,
        ...safeRow
      } = row;
      return {
        ...safeRow,
        next_due_date: row.frequencia === "mensal"
          ? nextOccurrence(row, new Date(now))?.dueDate ?? null
          : null,
        latest_reminder: row.frequencia === "mensal" && latest
          ? {
              kind: latest.kind,
              competencia: latest.competencia,
              status: latest.status,
              sent_at: latest.sent_at,
              error_code: latest.error_code,
            }
          : null,
        latest_instructions: row.frequencia === "mensal" && instructions
          ? {
              generation: instructions.generation,
              receipt_competencia: instructions.receipt_competencia,
              status: instructions.status === "sending" &&
                  instructions.reservation_expires_at &&
                  new Date(instructions.reservation_expires_at).getTime() <= now
                ? instructions.provider_call_started_at ? "uncertain" as const : "pending" as const
                : instructions.status,
              sent_at: instructions.sent_at,
              error_code: instructions.error_code,
            }
          : null,
        current_receipt: row.frequencia === "mensal" && currentLedger
          ? {
              competencia: currentLedger.competencia,
              status: monthlyReceiptState(currentLedger),
            }
          : null,
        pending_occurrences: row.frequencia === "mensal"
          ? ledger.filter((item) => !item.receipt_uploaded_at)
              .map((item) => ({ competencia: item.competencia, due_date: item.due_date }))
          : [],
        welcome_email_in_progress: Boolean(
          reservationToken &&
            reservationExpiresAt &&
            new Date(reservationExpiresAt).getTime() > now
        ),
      };
    });

    return { data, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar benfeitores." };
  }
}

export async function updateDonorDueDay(
  id: string,
  day: number
): Promise<
  | { success: true; dia_vencimento: number; next_due_date: string | null }
  | { success: false; error: string }
> {
  await requireAdmin();

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Benfeitor inválido." };
  }
  if (!z.number().int().min(1).max(31).safeParse(day).success) {
    return { success: false, error: "Informe um dia inteiro entre 1 e 31." };
  }

  try {
    const today = saoPauloDate(new Date());
    const updated = await db.transaction(async (tx) => {
      const [pledge] = await tx.update(donorPledges)
        .set({ dia_vencimento: day })
        .where(and(eq(donorPledges.id, id), eq(donorPledges.frequencia, "mensal")))
        .returning({
          id: donorPledges.id,
          created_at: donorPledges.created_at,
          frequencia: donorPledges.frequencia,
          duracao: donorPledges.duracao,
          dia_vencimento: donorPledges.dia_vencimento,
        });
      if (!pledge) return null;

      const snapshots = await tx.query.donorPaymentLedger.findMany({
        where: and(
          eq(donorPaymentLedger.pledge_id, id),
          gte(donorPaymentLedger.due_date, today)
        ),
      });
      for (const snapshot of snapshots) {
        const decision = dueSnapshotDecision(pledge, snapshot, today);
        if (decision.kind === "keep") continue;
        const eligible = and(
          eq(donorPaymentLedger.id, snapshot.id),
          gte(donorPaymentLedger.due_date, today),
          isNull(donorPaymentLedger.receipt_path),
          isNull(donorPaymentLedger.receipt_name),
          isNull(donorPaymentLedger.receipt_uploaded_at)
        );
        if (decision.kind === "update") {
          await tx.update(donorPaymentLedger)
            .set({ due_date: decision.dueDate, updated_at: new Date().toISOString() })
            .where(eligible);
        } else {
          // A sent reminder still points to this competence; retain its row.
          const reminder = await tx.query.donorReminderSends.findFirst({
            columns: { id: true },
            where: and(
              eq(donorReminderSends.pledge_id, id),
              eq(donorReminderSends.competencia, snapshot.competencia)
            ),
          });
          if (!reminder) await tx.delete(donorPaymentLedger).where(eligible);
        }
      }
      return pledge;
    });

    if (!updated || updated.dia_vencimento === null) {
      return { success: false, error: "Contribuição mensal não encontrada." };
    }

    return {
      success: true,
      dia_vencimento: updated.dia_vencimento,
      next_due_date: nextOccurrence(updated, new Date())?.dueDate ?? null,
    };
  } catch {
    return { success: false, error: "Não foi possível atualizar o dia. Tente novamente." };
  }
}

export async function deleteDonorPledge(id: string): Promise<ActionResult> {
  await requireAuth();

  const donor = await db.query.donorPledges.findFirst({
    columns: { recibo_path: true },
    where: eq(donorPledges.id, id),
  });

  try {
    await db.delete(donorPledges).where(eq(donorPledges.id, id));
  } catch {
    return { success: false, error: "Erro ao excluir benfeitor." };
  }

  // O recibo é um documento sensível: excluir o cadastro sem apagar o
  // arquivo deixaria o comprovante retido sem referência no banco.
  if (donor?.recibo_path) {
    await getStorage().remove(donor.recibo_path);
  }

  return { success: true };
}

export async function exportDonorPledge(
  id: string
): Promise<{ pdfBase64: string; filename: string } | { error: string }> {
  await requireAuth();

  const donor = await db.query.donorPledges.findFirst({
    where: eq(donorPledges.id, id),
  });

  if (!donor) {
    return { error: "Benfeitor não encontrado." };
  }

  const { data: header, error: headerError } = await getDocumentHeader();
  if (!header) return { error: headerError ?? HEADER_LOAD_ERROR };

  const { renderDonorPdf } = await import("@/lib/pdf/donor-pdf");
  const pdf = await renderDonorPdf({ ...donor, header });

  const safeNome = donor.nome
    .replace(/[^a-zA-Z0-9À-ú ]/g, "")
    .replace(/\s+/g, "_");
  const filename = `benfeitor_${safeNome}.pdf`;

  return { pdfBase64: pdf.toString("base64"), filename };
}

// --- Document URL ---

function resolveDocumentPaths(path: string, applicationId?: string): string[] {
  const paths = [path];

  if (path.startsWith("pending/") && applicationId) {
    const rest = path.replace(/^pending\/[^/]+\//, "");
    if (rest) {
      paths.push(`applications/${applicationId}/${rest}`);
    }
  }

  return paths;
}

/**
 * URL temporária para o admin abrir um documento. O ticket assinado expira em
 * 5 minutos e é o que autoriza a rota `/api/documents` a ler o arquivo.
 */
export async function getDocumentUrl(
  path: string,
  applicationId?: string
): Promise<{ url: string } | { error: string }> {
  await requireAuth();

  // PDFs finais possuem uma fronteira própria: são resolvidos exclusivamente
  // pelo ID persistido em getIssuedDocumentUrl, nunca por caminho fornecido.
  if (/^applications\/[^/]+\/issued\//.test(path)) {
    return { error: "Use o documento final emitido para gerar o download." };
  }

  const storage = getStorage();

  for (const candidate of resolveDocumentPaths(path, applicationId)) {
    if ((await storage.size(candidate)) === null) continue;

    const ticket = createTicket(
      candidate,
      "download",
      DOCUMENT_TICKET_TTL_SECONDS
    );

    return { url: `/api/documents?ticket=${encodeURIComponent(ticket)}` };
  }

  return { error: "Erro ao gerar URL do documento." };
}

// --- Decisions ---

export async function approveApplication(
  id: string,
  desconto: number,
  motivo?: string
): Promise<ActionResult> {
  if (desconto < 0 || desconto > 100) {
    return { success: false, error: "Desconto deve estar entre 0 e 100." };
  }

  const { user } = await requireAuth();

  try {
    // Condicional em `pendente`: impede que duas decisões concorrentes se
    // sobrescrevam e que um ID inexistente retorne sucesso.
    const rows = await db
      .update(applications)
      .set({
        status: "aprovada",
        desconto_concedido: desconto,
        motivo: motivo || null,
        data_decisao: new Date().toISOString(),
        decided_by: resolveDecidedBy(user.id),
      })
      .where(
        and(eq(applications.id, id), eq(applications.status, "pendente"))
      )
      .returning({ id: applications.id });

    if (rows.length === 0) {
      return {
        success: false,
        error: "Solicitação não encontrada ou já decidida.",
      };
    }
  } catch {
    return { success: false, error: "Erro ao aprovar solicitação." };
  }

  return { success: true };
}

export async function rejectApplication(
  id: string,
  motivo?: string
): Promise<ActionResult> {
  const { user } = await requireAuth();

  try {
    const rows = await db
      .update(applications)
      .set({
        status: "rejeitada",
        motivo: motivo || null,
        data_decisao: new Date().toISOString(),
        decided_by: resolveDecidedBy(user.id),
      })
      .where(
        and(eq(applications.id, id), eq(applications.status, "pendente"))
      )
      .returning({ id: applications.id });

    if (rows.length === 0) {
      return {
        success: false,
        error: "Solicitação não encontrada ou já decidida.",
      };
    }
  } catch {
    return { success: false, error: "Erro ao rejeitar solicitação." };
  }

  return { success: true };
}

// --- School Years ---

export async function getSchoolYears() {
  await requireAuth();

  try {
    const data = await db.query.schoolYears.findMany({
      orderBy: desc(schoolYears.data_inicio),
    });

    return { data, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar anos letivos." };
  }
}

export async function createSchoolYear(input: {
  nome: string;
  data_inicio: string;
  data_fim: string;
}): Promise<
  ActionResult & {
    data?: {
      id: string;
      nome: string;
      data_inicio: string;
      data_fim: string;
      ativo: boolean;
    };
  }
> {
  if (new Date(input.data_fim) < new Date(input.data_inicio)) {
    return {
      success: false,
      error: "Data de fim deve ser posterior à data de início.",
    };
  }

  await requireAuth();

  try {
    // Devolve a linha criada: o cliente precisa do ID real para ativar ou
    // excluir o ano letivo sem recarregar a página.
    const [created] = await db
      .insert(schoolYears)
      .values({
        nome: input.nome,
        data_inicio: input.data_inicio,
        data_fim: input.data_fim,
        ativo: false,
      })
      .returning({
        id: schoolYears.id,
        nome: schoolYears.nome,
        data_inicio: schoolYears.data_inicio,
        data_fim: schoolYears.data_fim,
        ativo: schoolYears.ativo,
      });

    return { success: true, data: created };
  } catch {
    return { success: false, error: "Erro ao criar ano letivo." };
  }
}

export async function toggleSchoolYear(id: string): Promise<ActionResult> {
  await requireAuth();

  const current = await db.query.schoolYears.findFirst({
    columns: { ativo: true },
    where: eq(schoolYears.id, id),
  });

  if (!current) {
    return { success: false, error: "Ano letivo não encontrado." };
  }

  try {
    // O trigger `trg_enforce_single_active_school_year` desativa os demais.
    await db
      .update(schoolYears)
      .set({ ativo: !current.ativo })
      .where(eq(schoolYears.id, id));
  } catch {
    return { success: false, error: "Erro ao atualizar ano letivo." };
  }

  return { success: true };
}

export async function deleteSchoolYear(id: string): Promise<ActionResult> {
  await requireAuth();

  try {
    await db.delete(schoolYears).where(eq(schoolYears.id, id));
  } catch {
    return { success: false, error: "Erro ao excluir ano letivo." };
  }

  return { success: true };
}

// --- Decision Templates ---

export async function getTemplates() {
  await requireAuth();

  try {
    const data = await db.query.decisionTemplates.findMany({
      orderBy: asc(decisionTemplates.tipo),
    });

    return { data, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar modelos de decisão." };
  }
}

export async function saveTemplate(input: {
  tipo: "aprovacao" | "rejeicao";
  cabecalho: string;
  corpo: string;
  rodape: string;
}): Promise<ActionResult> {
  await requireAuth();

  try {
    // Upsert sobre a unicidade de `tipo` (decision_templates_tipo_idx):
    // atômico, sem a janela do padrão consultar-depois-inserir.
    await db
      .insert(decisionTemplates)
      .values({
        tipo: input.tipo,
        cabecalho: input.cabecalho,
        corpo: input.corpo,
        rodape: input.rodape,
      })
      .onConflictDoUpdate({
        target: decisionTemplates.tipo,
        set: {
          cabecalho: input.cabecalho,
          corpo: input.corpo,
          rodape: input.rodape,
          updated_at: new Date().toISOString(),
        },
      });
  } catch {
    return { success: false, error: "Erro ao salvar modelo." };
  }

  return { success: true };
}

// --- Decision Export ---

export async function exportDecision(
  id: string
): Promise<{ pdfBase64: string; filename: string } | { error: string }> {
  const { user } = await requireAuth();

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: { students: true, school_years: true },
  });

  if (!app) {
    return { error: "Solicitação não encontrada." };
  }

  if (app.status === "pendente") {
    return { error: "Solicitação ainda não foi decidida." };
  }

  const templateTipo = app.status === "aprovada" ? "aprovacao" : "rejeicao";

  const template = await db.query.decisionTemplates.findFirst({
    where: eq(decisionTemplates.tipo, templateTipo),
  });

  if (!template) {
    return { error: "Modelo de decisão não encontrado." };
  }

  const tokenData: TokenData = {
    nome_pai: app.pai_nome,
    nome_mae: app.mae_nome,
    escola: app.escola,
    alunos: (app.students ?? []).map((s) => s.nome),
    desconto: app.desconto_concedido?.toString() ?? "0",
    data: app.data_decisao
      ? new Date(app.data_decisao).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR"),
    motivo: app.motivo,
    ano_letivo: app.school_years?.nome ?? "",
  };

  const { data: header, error: headerError } = await getDocumentHeader();
  if (!header) return { error: headerError ?? HEADER_LOAD_ERROR };

  const resolved = {
    titulo: `Decisão - ${app.escola}`,
    cabecalho: replaceTokens(template.cabecalho, tokenData),
    corpo: replaceTokens(template.corpo, tokenData),
    rodape: replaceTokens(template.rodape, tokenData),
    header,
  };

  const { renderDecisionPdf } = await import("@/lib/pdf/decision-pdf");
  const pdf = await renderDecisionPdf(resolved);

  const safeNome = app.pai_nome
    .replace(/[^a-zA-Z0-9À-ú ]/g, "")
    .replace(/\s+/g, "_");
  const filename = `decisao_${templateTipo}_${safeNome}.pdf`;
  const issuedBy = await issuanceActorId(user);
  if (!issuedBy) return { error: "Não foi possível identificar o emissor da decisão." };
  try {
    await persistIssuedDocument({ applicationId: app.id, kind: "decision", issuedBy, filename, pdf });
  } catch {
    return { error: "Não foi possível registrar a emissão da decisão." };
  }

  return { pdfBase64: pdf.toString("base64"), filename };
}

// --- Application Data Export (PDF) ---

export async function exportApplication(
  id: string
): Promise<{ pdfBase64: string; filename: string } | { error: string }> {
  await requireAuth();

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: {
      students: true,
      other_children: true,
      vehicles: true,
      collaboration: true,
      benefactors: true,
      school_years: true,
    },
  });

  if (!app) {
    return { error: "Solicitação não encontrada." };
  }

  const { data: header, error: headerError } = await getDocumentHeader();
  if (!header) return { error: headerError ?? HEADER_LOAD_ERROR };

  const { renderApplicationPdf } = await import("@/lib/pdf/application-pdf");
  const pdf = await renderApplicationPdf({
    ...app,
    header,
    ano_letivo: app.school_years?.nome ?? null,
    collaboration: app.collaboration ?? null,
  });

  const safeNome = app.pai_nome
    .replace(/[^a-zA-Z0-9À-ú ]/g, "")
    .replace(/\s+/g, "_");
  const filename = `solicitacao_${safeNome}.pdf`;

  return { pdfBase64: pdf.toString("base64"), filename };
}

// --- Institutional header shared by all PDFs and emails ---

export async function getDocumentHeader() {
  await requireAuth();
  try {
    return { data: await loadDocumentHeader(), error: null };
  } catch {
    return { data: null, error: HEADER_LOAD_ERROR };
  }
}

export async function saveDocumentHeader(input: DocumentHeaderData): Promise<ActionResult> {
  await requireAuth();
  try {
    await persistDocumentHeader(input);
  } catch {
    return { success: false, error: "Não foi possível salvar o cabeçalho. Tente novamente." };
  }
  revalidatePath("/admin", "layout");
  return { success: true };
}

// --- Contract Template ---

export interface ContractTemplate {
  id: string;
  titulo: string;
  cabecalho: string;
  clausulas: ContractClause[];
  rodape: string;
}

export async function getContractTemplate() {
  await requireAuth();

  try {
    const data = await db.query.contractTemplates.findFirst({
      orderBy: desc(contractTemplates.updated_at),
    });

    return { data: (data as ContractTemplate) ?? null, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar modelo de contrato." };
  }
}

export async function saveContractTemplate(input: {
  titulo: string;
  cabecalho: string;
  clausulas: ContractClause[];
  rodape: string;
}): Promise<ActionResult> {
  await requireAuth();

  const existing = await db.query.contractTemplates.findFirst({
    columns: { id: true },
    orderBy: desc(contractTemplates.updated_at),
  });

  const payload = {
    titulo: input.titulo,
    cabecalho: input.cabecalho,
    clausulas: input.clausulas,
    rodape: input.rodape,
    updated_at: new Date().toISOString(),
  };

  try {
    if (existing) {
      await db
        .update(contractTemplates)
        .set(payload)
        .where(eq(contractTemplates.id, existing.id));
    } else {
      await db.insert(contractTemplates).values(payload);
    }
  } catch {
    return {
      success: false,
      error: existing
        ? "Erro ao atualizar modelo de contrato."
        : "Erro ao criar modelo de contrato.",
    };
  }

  return { success: true };
}

// Formata 'YYYY-MM-DD' como 'DD/MM/YYYY' sem depender de fuso horário.
function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

// --- Contract Export (PDF) ---

export async function exportContract(
  id: string
): Promise<{ pdfBase64: string; filename: string } | { error: string }> {
  const { user } = await requireAuth();

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, id),
    with: { students: true, school_years: true },
  });

  if (!app) {
    return { error: "Solicitação não encontrada." };
  }

  if (app.status !== "aprovada") {
    return {
      error: "O contrato só pode ser gerado para solicitações aprovadas.",
    };
  }

  const { data: template, error: templateError } = await getContractTemplate();

  if (templateError || !template) {
    return { error: "Modelo de contrato não encontrado." };
  }

  const tokenData: ContractTokenData = {
    aluno: (app.students ?? []).map((s) => s.nome).join(", "),
    nome_responsavel: app.pai_nome,
    rg_responsavel: app.pai_rg ?? "",
    cpf_responsavel: app.pai_cpf ?? "",
    endereco: app.cep ? `${app.endereco}, CEP ${app.cep}` : app.endereco,
    desconto: app.desconto_concedido?.toString() ?? "0",
    ano_letivo: app.school_years?.nome ?? "",
    data_inicio: app.school_years?.data_inicio
      ? formatDateBR(app.school_years.data_inicio)
      : "",
    data_termino: app.school_years?.data_fim
      ? formatDateBR(app.school_years.data_fim)
      : "",
    data_extenso: formatDataExtenso(new Date()),
  };

  const { data: header, error: headerError } = await getDocumentHeader();
  if (!header) return { error: headerError ?? HEADER_LOAD_ERROR };

  const resolved = {
    titulo: replaceContractTokens(template.titulo, tokenData),
    cabecalho: replaceContractTokens(template.cabecalho, tokenData),
    clausulas: (template.clausulas ?? []).map((c) => ({
      titulo: replaceContractTokens(c.titulo, tokenData),
      corpo: replaceContractTokens(c.corpo, tokenData),
    })),
    rodape: replaceContractTokens(template.rodape, tokenData),
    header,
  };

  const { renderContractPdf } = await import("@/lib/pdf/contract-pdf");
  const pdf = await renderContractPdf(resolved);

  const safeNome = app.pai_nome
    .replace(/[^a-zA-Z0-9À-ú ]/g, "")
    .replace(/\s+/g, "_");
  const filename = `contrato_${safeNome}.pdf`;
  const issuedBy = await issuanceActorId(user);
  if (!issuedBy) return { error: "Não foi possível identificar o emissor do contrato." };
  try {
    await persistIssuedDocument({ applicationId: app.id, kind: "contract", issuedBy, filename, pdf });
  } catch {
    return { error: "Não foi possível registrar a emissão do contrato." };
  }

  return { pdfBase64: pdf.toString("base64"), filename };
}

export async function getCurrentIssuedDocuments(applicationId: string) {
  await requireCapability("issued-documents:read");
  const application = await db.query.applications.findFirst({
    columns: { status: true },
    where: eq(applications.id, applicationId),
  });
  if (!application || application.status === "pendente") return [];
  const documents = await listCurrentIssuedDocuments(applicationId);
  return application.status === "aprovada"
    ? documents
    : documents.filter((document) => document.kind === "decision");
}

export async function getIssuedDocumentUrl(id: string): Promise<{ url: string } | { error: string }> {
  const staff = await requireCapability("issued-documents:read");
  const document = await findIssuedDocument(id);
  if (document && staff.role === "secretaria") {
    const current = await getCurrentIssuedDocuments(document.application_id);
    if (!current.some((item) => item.id === id)) return { error: "Documento final não encontrado." };
  }
  if (!document || (await getStorage().size(document.storage_path)) == null) return { error: "Documento final não encontrado." };
  const ticket = createTicket(document.storage_path, "download", DOCUMENT_TICKET_TTL_SECONDS);
  return { url: `/api/documents?ticket=${encodeURIComponent(ticket)}` };
}

export async function getIssuedDocumentHistory(applicationId: string) {
  await requireAdmin();
  return listIssuedDocumentHistory(applicationId);
}
