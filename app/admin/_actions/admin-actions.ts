"use server";

import { asc, desc, eq } from "drizzle-orm";
import { BYPASS_USER, isAuthBypass } from "@/lib/auth/bypass";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  applications,
  contractTemplates,
  decisionTemplates,
  documentHeader,
  donorPledges,
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

type ActionResult = { success: boolean; error?: string };

const DOCUMENT_TICKET_TTL_SECONDS = 300;

function resolveDecidedBy(userId: string): string | null {
  // O bypass usa um UUID de fachada que não existe em admin_users.
  if (isAuthBypass() && userId === BYPASS_USER.id) {
    return null;
  }
  return userId;
}

async function requireAuth() {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("Não autorizado. Faça login para continuar.");
  }

  return { user };
}

// --- Applications ---

export async function getApplications(
  filter?: "pendente" | "aprovada" | "rejeitada"
) {
  await requireAuth();

  try {
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
  await requireAuth();

  try {
    const data = await db.query.donorPledges.findMany({
      orderBy: desc(donorPledges.created_at),
    });

    return { data, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar benfeitores." };
  }
}

export async function deleteDonorPledge(id: string): Promise<ActionResult> {
  await requireAuth();

  try {
    await db.delete(donorPledges).where(eq(donorPledges.id, id));
  } catch {
    return { success: false, error: "Erro ao excluir benfeitor." };
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

  const { data: header } = await getDocumentHeader();

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
    await db
      .update(applications)
      .set({
        status: "aprovada",
        desconto_concedido: desconto,
        motivo: motivo || null,
        data_decisao: new Date().toISOString(),
        decided_by: resolveDecidedBy(user.id),
      })
      .where(eq(applications.id, id));
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
    await db
      .update(applications)
      .set({
        status: "rejeitada",
        motivo: motivo || null,
        data_decisao: new Date().toISOString(),
        decided_by: resolveDecidedBy(user.id),
      })
      .where(eq(applications.id, id));
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
}): Promise<ActionResult> {
  if (new Date(input.data_fim) < new Date(input.data_inicio)) {
    return {
      success: false,
      error: "Data de fim deve ser posterior à data de início.",
    };
  }

  await requireAuth();

  try {
    await db.insert(schoolYears).values({
      nome: input.nome,
      data_inicio: input.data_inicio,
      data_fim: input.data_fim,
      ativo: false,
    });
  } catch {
    return { success: false, error: "Erro ao criar ano letivo." };
  }

  return { success: true };
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

  const existing = await db.query.decisionTemplates.findFirst({
    columns: { id: true },
    where: eq(decisionTemplates.tipo, input.tipo),
  });

  try {
    if (existing) {
      await db
        .update(decisionTemplates)
        .set({
          cabecalho: input.cabecalho,
          corpo: input.corpo,
          rodape: input.rodape,
          updated_at: new Date().toISOString(),
        })
        .where(eq(decisionTemplates.id, existing.id));
    } else {
      await db.insert(decisionTemplates).values({
        tipo: input.tipo,
        cabecalho: input.cabecalho,
        corpo: input.corpo,
        rodape: input.rodape,
      });
    }
  } catch {
    return {
      success: false,
      error: existing
        ? "Erro ao atualizar modelo."
        : "Erro ao criar modelo.",
    };
  }

  return { success: true };
}

// --- Decision Export ---

export async function exportDecision(
  id: string
): Promise<{ pdfBase64: string; filename: string } | { error: string }> {
  await requireAuth();

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

  const { data: header } = await getDocumentHeader();

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

  const { data: header } = await getDocumentHeader();

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

// --- Document Header (selo + texto compartilhado nos PDFs) ---

export interface DocumentHeader {
  id: string;
  linha1: string;
  linha2: string;
  linha3: string;
  mostrar_selo: boolean;
}

export async function getDocumentHeader() {
  await requireAuth();

  try {
    const data = await db.query.documentHeader.findFirst({
      orderBy: desc(documentHeader.updated_at),
    });

    return { data: (data as DocumentHeader) ?? null, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar cabeçalho dos documentos." };
  }
}

export async function saveDocumentHeader(input: {
  linha1: string;
  linha2: string;
  linha3: string;
  mostrar_selo: boolean;
}): Promise<ActionResult> {
  await requireAuth();

  const existing = await db.query.documentHeader.findFirst({
    columns: { id: true },
    orderBy: desc(documentHeader.updated_at),
  });

  const payload = {
    linha1: input.linha1,
    linha2: input.linha2,
    linha3: input.linha3,
    mostrar_selo: input.mostrar_selo,
    updated_at: new Date().toISOString(),
  };

  try {
    if (existing) {
      await db
        .update(documentHeader)
        .set(payload)
        .where(eq(documentHeader.id, existing.id));
    } else {
      await db.insert(documentHeader).values(payload);
    }
  } catch {
    return {
      success: false,
      error: existing
        ? "Erro ao atualizar cabeçalho."
        : "Erro ao criar cabeçalho.",
    };
  }

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
  await requireAuth();

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

  const { data: header } = await getDocumentHeader();

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

  return { pdfBase64: pdf.toString("base64"), filename };
}
