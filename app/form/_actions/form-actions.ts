"use server";

import { randomUUID } from "crypto";
import { and, asc, eq, gt, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { getApplicant } from "@/lib/auth/applicant-session";
import {
  applicationDrafts,
  applications,
  benefactors,
  documentRequests,
  collaboration,
  documents,
  otherChildren,
  schoolYears,
  students,
  vehicles,
} from "@/lib/db/schema";
import { getStorage, guessMimeType } from "@/lib/storage";
import { createTicket } from "@/lib/storage/tickets";
import {
  applicationSubmissionSchema,
  type ApplicationSubmission,
} from "@/lib/validations/application-schema";

interface SchoolYear {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

const UPLOAD_TICKET_TTL_SECONDS = 30 * 60;
const SCHOLARSHIP_UPLOAD_CATEGORIES = new Set([
  "declaracao_vaga", "carta_recomendacao", "rg_pai", "rg_mae", "certidao", "comprovante_endereco",
  "extrato_ir", "extrato_bancario",
  // Documento reenviado para atender uma pendência pedida pela equipe.
  "pendencia",
]);
const MAX_REQUESTED_FILES = 5;
const isScholarshipUploadCategory = (category: string) =>
  SCHOLARSHIP_UPLOAD_CATEGORIES.has(category) || /^(rg_aluno|certidao_nascimento)_\d+$/.test(category);

/** Limite do JSON do rascunho; o formulário completo ocupa poucos kB. */
const MAX_DRAFT_BYTES = 256 * 1024;
const NOT_LOGGED_IN = "Sua sessão expirou. Entre novamente para continuar.";

/** Pasta dos arquivos de rascunho de uma conta; nunca é apagada pela limpeza de 48 h de `pending/`. */
function draftUploadPrefix(accountId: string): string {
  return `drafts/${accountId}/`;
}

function pathsMatchCategory(paths: string[], prefix: string, category: string, seen: Set<string>) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`^${escape(prefix)}[^/]+/${escape(category)}/[^/]+$`);
  return paths.every((path) => expression.test(path) && !seen.has(path) && (seen.add(path), true));
}

function validateDocumentCategories(data: ApplicationSubmission, prefix: string): boolean {
  const seen = new Set<string>();
  const required: Array<[string[], string]> = [
    [data.declaracao_vaga, "declaracao_vaga"],
    [data.carta_recomendacao, "carta_recomendacao"],
    [data.pai.documentos, "rg_pai"],
    [data.mae.documentos, "rg_mae"],
    [data.certidao_casamento, "certidao"],
    [data.comprovante_endereco, "comprovante_endereco"],
    [data.extrato_ir, "extrato_ir"],
    [data.extratos_bancarios, "extrato_bancario"],
    ...data.alunos.flatMap((student, index): Array<[string[], string]> => [
      [student.documento_identidade, `rg_aluno_${index}`],
      [student.certidao_nascimento, `certidao_nascimento_${index}`],
    ]),
  ];
  return required.every(([paths, category]) => pathsMatchCategory(paths, prefix, category, seen));
}

// Data de hoje em São Paulo como "YYYY-MM-DD". O container roda em UTC; sem o
// fuso explícito a janela de inscrição fecharia 3 horas mais cedo no último dia.
function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function isWithinWindow(year: { data_inicio: string; data_fim: string }) {
  const today = todayInSaoPaulo();
  return today >= year.data_inicio && today <= year.data_fim;
}

export async function getActiveSchoolYear(): Promise<{
  open: boolean;
  year?: SchoolYear;
  upcomingYear?: SchoolYear;
}> {
  const year = await db.query.schoolYears.findFirst({
    where: and(lte(schoolYears.data_inicio, todayInSaoPaulo()), gte(schoolYears.data_fim, todayInSaoPaulo())),
    orderBy: [asc(schoolYears.data_inicio), asc(schoolYears.id)],
  });

  if (year && isWithinWindow(year)) {
    return { open: true, year };
  }

  const upcomingYear = await db.query.schoolYears.findFirst({
    where: gt(schoolYears.data_inicio, todayInSaoPaulo()),
    orderBy: [asc(schoolYears.data_inicio), asc(schoolYears.id)],
  });

  return {
    open: false,
    ...(year ? { year } : {}),
    ...(upcomingYear ? { upcomingYear } : {}),
  };
}

function uploadTicket(prefix: string, filename: string, category: string) {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!sanitized || sanitized === "." || sanitized === "..") return { error: "Nome de arquivo inválido." };
  const path = `${prefix}${randomUUID()}/${category}/${sanitized}`;
  const ticket = createTicket(path, "upload", UPLOAD_TICKET_TTL_SECONDS);
  return { url: `/api/uploads?ticket=${encodeURIComponent(ticket)}`, path };
}

/**
 * Emite um ticket de upload anônimo, só para o comprovante do benfeitor. O
 * caminho de destino é escolhido aqui e viaja dentro do ticket, então o
 * cliente não consegue gravar em outro lugar.
 */
export async function createUploadUrl(
  filename: string,
  category: string
): Promise<{ url: string; path: string } | { error: string }> {
  try {
    if (category !== "recibo_pagamento") return { error: "Categoria de documento inválida." };
    return uploadTicket("pending/", filename, category);
  } catch {
    return { error: "Erro ao gerar URL de upload. Tente novamente." };
  }
}

/**
 * Ticket de upload dos documentos da bolsa. Exige o solicitante logado e grava
 * na pasta de rascunho da conta, que só essa conta consegue enviar.
 */
export async function createApplicantUploadUrl(
  filename: string,
  category: string
): Promise<{ url: string; path: string } | { error: string }> {
  try {
    const applicant = await getApplicant();
    if (!applicant) return { error: NOT_LOGGED_IN };
    if (!isScholarshipUploadCategory(category)) return { error: "Categoria de documento inválida." };
    return uploadTicket(draftUploadPrefix(applicant.id), filename, category);
  } catch {
    return { error: "Erro ao gerar URL de upload. Tente novamente." };
  }
}

async function activeYearInWindow() {
  const year = await db.query.schoolYears.findFirst({
    columns: { id: true, data_inicio: true, data_fim: true },
    where: and(lte(schoolYears.data_inicio, todayInSaoPaulo()), gte(schoolYears.data_fim, todayInSaoPaulo())),
    orderBy: [asc(schoolYears.data_inicio), asc(schoolYears.id)],
  });
  return year && isWithinWindow(year) ? year : null;
}

/** Salva o rascunho do formulário (dados e etapa) da conta logada no ano aberto. */
export async function saveApplicationDraft(
  data: unknown,
  currentStep: number
): Promise<{ success: true; savedAt: string } | { success: false; error: string }> {
  const applicant = await getApplicant();
  if (!applicant) return { success: false, error: NOT_LOGGED_IN };
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { success: false, error: "Rascunho inválido." };
  }
  if (Buffer.byteLength(JSON.stringify(data)) > MAX_DRAFT_BYTES) {
    return { success: false, error: "Rascunho grande demais para ser salvo." };
  }
  const step = Math.min(Math.max(Math.trunc(Number(currentStep) || 1), 1), 6);

  try {
    const year = await activeYearInWindow();
    if (!year) return { success: false, error: "O período de inscrição não está aberto no momento." };

    const submitted = await db.query.applications.findFirst({
      columns: { id: true },
      where: and(eq(applications.applicant_account_id, applicant.id), eq(applications.school_year_id, year.id)),
    });
    if (submitted) return { success: false, error: "Sua solicitação já foi enviada." };

    const savedAt = new Date().toISOString();
    await db
      .insert(applicationDrafts)
      .values({ account_id: applicant.id, school_year_id: year.id, data, current_step: step, updated_at: savedAt })
      .onConflictDoUpdate({
        target: [applicationDrafts.account_id, applicationDrafts.school_year_id],
        set: { data, current_step: step, updated_at: savedAt },
      });
    return { success: true, savedAt };
  } catch (error) {
    console.error("[saveApplicationDraft] falha:", error instanceof Error ? error.message : error);
    return { success: false, error: "Não foi possível salvar o rascunho." };
  }
}

export async function submitApplication(
  input: ApplicationSubmission
): Promise<{ success: boolean; id?: string; errors?: Record<string, string[]> }> {
  const result = applicationSubmissionSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  const data = result.data;

  const applicant = await getApplicant();
  if (!applicant) return { success: false, errors: { _form: [NOT_LOGGED_IN] } };

  // Só aceita arquivos da pasta de rascunho da própria conta.
  if (!validateDocumentCategories(data, draftUploadPrefix(applicant.id))) {
    return { success: false, errors: { _form: ["Os documentos enviados não correspondem às categorias exigidas."] } };
  }

  // Revalida a janela aqui: a Server Action pode ser chamada diretamente,
  // sem passar pela página que já faz essa checagem.
  const activeYear = await activeYearInWindow();
  if (!activeYear) {
    return {
      success: false,
      errors: {
        _form: ["O período de inscrição não está aberto no momento."],
      },
    };
  }

  const alreadySubmitted = await db.query.applications.findFirst({
    columns: { id: true },
    where: and(eq(applications.applicant_account_id, applicant.id), eq(applications.school_year_id, activeYear.id)),
  });
  if (alreadySubmitted) {
    return { success: false, errors: { _form: ["Sua solicitação deste ano letivo já foi enviada."] } };
  }

  try {
    const saved = await db.transaction(async (tx) => {
      const [application] = await tx
        .insert(applications)
        .values({
          school_year_id: activeYear.id,
          applicant_account_id: applicant.id,
          escola: data.escola,
          pai_nome: data.pai.nome,
          pai_rg: data.pai.rg,
          pai_cpf: data.pai.cpf.replace(/\D/g, ""),
          pai_profissao: data.pai.profissao || null,
          mae_nome: data.mae.nome,
          mae_cpf: data.mae.cpf.replace(/\D/g, ""),
          mae_profissao: data.mae.profissao || null,
          endereco: data.endereco,
          cep: data.cep || null,
          telefone: data.telefone,
          email: data.email || null,
          renda_pai: data.renda.pai ?? null,
          renda_mae: data.renda.mae ?? null,
          renda_outros: data.renda.outros ?? null,
          pessoas_domicilio: data.renda.pessoas,
          despesa_aluguel: data.despesas.aluguel ?? null,
          despesa_servicos: data.despesas.servicos ?? null,
          despesa_tv: data.despesas.tv ?? null,
          despesa_celular_plano: data.despesas.celular_plano ?? null,
          despesa_celular_parcelas: data.despesas.celular_parcelas ?? null,
          despesa_internet: data.despesas.internet ?? null,
          desconto_solicitado: data.desconto_solicitado,
        })
        .returning({ id: applications.id });

      const id = application.id;

      const insertedStudents = await tx
        .insert(students)
        .values(
          data.alunos.map((s) => ({
            application_id: id,
            nome: s.nome,
            cpf: s.cpf?.replace(/\D/g, "") || null,
            serie: s.serie,
            mensalidade: s.mensalidade,
          }))
        )
        .returning({ id: students.id, nome: students.nome });

      if (data.outros_filhos.length > 0) {
        await tx.insert(otherChildren).values(
          data.outros_filhos.map((c) => ({
            application_id: id,
            nome: c.nome,
            cpf: c.cpf?.replace(/\D/g, "") || null,
            nascimento: c.nascimento,
          }))
        );
      }

      if (data.veiculos.length > 0) {
        await tx.insert(vehicles).values(
          data.veiculos.map((v) => ({
            application_id: id,
            marca: v.marca,
            modelo: v.modelo,
            ano: v.ano,
          }))
        );
      }

      await tx.insert(collaboration).values({
        application_id: id,
        limpeza: data.colaboracao.limpeza?.ativo ?? false,
        limpeza_vezes_semana: data.colaboracao.limpeza?.vezes_semana ?? null,
        mutirao: data.colaboracao.mutirao?.ativo ?? false,
        mutirao_sabados: data.colaboracao.mutirao?.sabados ?? null,
        arrecadacao: data.colaboracao.arrecadacao ?? false,
        buscar_benfeitores: data.colaboracao.benfeitores ?? false,
        outros: data.colaboracao.outros ?? null,
      });

      if (data.indicacao_benfeitores.length > 0) {
        await tx.insert(benefactors).values(
          data.indicacao_benfeitores.map((b) => ({
            application_id: id,
            nome: b.nome,
            email: b.email,
          }))
        );
      }

      const documentRows = collectDocumentRows(data, id, insertedStudents);
      await fillDocumentSizes(documentRows);

      if (documentRows.length > 0) {
        await tx.insert(documents).values(documentRows);
      }

      await tx
        .delete(applicationDrafts)
        .where(and(eq(applicationDrafts.account_id, applicant.id), eq(applicationDrafts.school_year_id, activeYear.id)));

      return { id, documentRows };
    });

    // Só depois do commit os arquivos saem de pending/: se a transação
    // falhar, nada foi movido e não sobram arquivos órfãos.
    await moveFilesToApplication(saved.documentRows, saved.id);

    return { success: true, id: saved.id };
  } catch (error) {
    console.error(
      "[submitApplication] falha ao salvar:",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      errors: {
        _form: ["Erro ao salvar a solicitação. Tente novamente."],
      },
    };
  }
}

/**
 * Reenvio de um documento pendente pela família logada: grava os arquivos
 * como documentos novos da solicitação, ligados à pendência, e marca a
 * pendência como reenviada. Os documentos anteriores continuam guardados.
 */
export async function submitRequestedDocument(
  requestId: string,
  paths: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  const applicant = await getApplicant();
  if (!applicant) return { success: false, error: NOT_LOGGED_IN };

  const unique = new Set(paths);
  if (!Array.isArray(paths) || paths.length === 0) return { success: false, error: "Envie pelo menos um arquivo." };
  if (paths.length > MAX_REQUESTED_FILES || unique.size !== paths.length) {
    return { success: false, error: `Envie no máximo ${MAX_REQUESTED_FILES} arquivos.` };
  }
  if (!pathsMatchCategory(paths, draftUploadPrefix(applicant.id), "pendencia", new Set())) {
    return { success: false, error: "Arquivo inválido. Envie o documento novamente." };
  }

  try {
    const request = await db.query.documentRequests.findFirst({
      columns: { id: true, status: true, categoria: true, student_id: true, application_id: true },
      with: { application: { columns: { id: true, applicant_account_id: true } } },
      where: eq(documentRequests.id, requestId),
    });
    if (!request || request.application.applicant_account_id !== applicant.id) {
      return { success: false, error: "Pendência não encontrada." };
    }
    if (request.status !== "aberta") return { success: false, error: "Este documento já foi reenviado." };

    const rows: DocumentRow[] = paths.map((path) => ({
      application_id: request.application_id,
      categoria: request.categoria,
      student_id: request.student_id,
      storage_path: path,
      nome_arquivo: path.split("/").pop() || path,
      mime_type: guessMimeType(path),
      tamanho_bytes: 0,
      document_request_id: request.id,
    }));
    await fillDocumentSizes(rows);

    const saved = await db.transaction(async (tx) => {
      const [changed] = await tx
        .update(documentRequests)
        .set({ status: "reenviada", resubmitted_at: new Date().toISOString() })
        .where(and(eq(documentRequests.id, request.id), eq(documentRequests.status, "aberta")))
        .returning({ id: documentRequests.id });
      if (!changed) return false;
      await tx.insert(documents).values(rows);
      return true;
    });
    if (!saved) return { success: false, error: "Este documento já foi reenviado." };

    await moveFilesToApplication(rows, request.application_id);
    return { success: true };
  } catch (error) {
    console.error("[submitRequestedDocument] falha:", error instanceof Error ? error.message : error);
    return { success: false, error: "Não foi possível enviar o documento. Tente novamente." };
  }
}

interface DocumentRow {
  application_id: string;
  categoria: string;
  student_id: string | null;
  storage_path: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
  document_request_id?: string | null;
}

function collectDocumentRows(
  data: ApplicationSubmission,
  appId: string,
  students: Array<{ id: string; nome: string }>
): DocumentRow[] {
  const rows: DocumentRow[] = [];

  const addDocs = (
    paths: string[],
    categoria: string,
    studentId: string | null = null
  ) => {
    for (const path of paths) {
      rows.push({
        application_id: appId,
        categoria,
        student_id: studentId,
        storage_path: path,
        nome_arquivo: path.split("/").pop() || path,
        mime_type: guessMimeType(path),
        tamanho_bytes: 0,
      });
    }
  };

  addDocs(data.declaracao_vaga, "declaracao_vaga");
  addDocs(data.carta_recomendacao, "carta_recomendacao");
  addDocs(data.pai.documentos, "rg_pai");
  addDocs(data.mae.documentos, "rg_mae");
  addDocs(data.certidao_casamento, "certidao_casamento");
  addDocs(data.comprovante_endereco, "comprovante_endereco");
  addDocs(data.extrato_ir, "extrato_ir");
  addDocs(data.extratos_bancarios, "extrato_bancario");

  // `RETURNING` preserva a ordem do insert, então o aluno i corresponde a
  // students[i] — casar por nome vincularia errado alunos homônimos.
  data.alunos.forEach((aluno, i) => {
    addDocs(aluno.documento_identidade, "rg_aluno", students[i]?.id ?? null);
    addDocs(aluno.certidao_nascimento, "certidao_nascimento", students[i]?.id ?? null);
  });

  return rows;
}

async function fillDocumentSizes(documentRows: DocumentRow[]) {
  const storage = getStorage();

  for (const doc of documentRows) {
    const size = await storage.size(doc.storage_path);
    if (!size || size <= 0) {
      throw new Error("Documento obrigatório não foi enviado");
    }
    doc.tamanho_bytes = size;
  }
}

/**
 * Move os arquivos de `drafts/{conta}/{uuid}/` para `applications/{id}/{uuid}/`
 * depois do commit e atualiza a linha correspondente. Se um move ou update
 * falhar, a linha mantém o caminho de origem — o admin lê o arquivo pelo
 * caminho gravado, então o documento segue acessível.
 */
async function moveFilesToApplication(
  documentRows: DocumentRow[],
  appId: string
) {
  const storage = getStorage();

  for (const doc of documentRows) {
    if (!doc.storage_path.startsWith("drafts/")) continue;

    const [, , uploadId, ...relativeParts] = doc.storage_path.split("/");
    const newPath = `applications/${appId}/${uploadId}/${relativeParts.join("/")}`;

    try {
      await storage.move(doc.storage_path, newPath);
      await db
        .update(documents)
        .set({ storage_path: newPath })
        .where(eq(documents.storage_path, doc.storage_path));
      doc.storage_path = newPath;
    } catch {
      // Mantém o caminho de origem: o documento segue acessível de lá.
    }
  }
}
