"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  benefactors,
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
import { SCHOLARSHIP_UPLOADS_ENABLED } from "@/lib/form/scholarship-uploads";

interface SchoolYear {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

const UPLOAD_TICKET_TTL_SECONDS = 30 * 60;

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
}> {
  const year = await db.query.schoolYears.findFirst({
    where: eq(schoolYears.ativo, true),
  });

  if (!year || !isWithinWindow(year)) {
    return { open: false };
  }

  return { open: true, year };
}

/**
 * Emite um ticket de upload assinado. O caminho de destino é escolhido aqui e
 * viaja dentro do ticket, então o cliente não consegue gravar em outro lugar.
 */
export async function createUploadUrl(
  filename: string,
  category: string
): Promise<{ url: string; path: string } | { error: string }> {
  try {
    // Uploads do formulário de bolsa ficam desativados na fase de testes;
    // o comprovante de benfeitor continua permitido.
    if (!SCHOLARSHIP_UPLOADS_ENABLED && category !== "recibo_pagamento") {
      return {
        error:
          "O envio de documentos está temporariamente desativado nesta fase de testes.",
      };
    }

    const uuid = randomUUID();
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `pending/${uuid}/${category}/${sanitized}`;
    const ticket = createTicket(path, "upload", UPLOAD_TICKET_TTL_SECONDS);

    return { url: `/api/uploads?ticket=${encodeURIComponent(ticket)}`, path };
  } catch {
    return { error: "Erro ao gerar URL de upload. Tente novamente." };
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

  const activeYear = await db.query.schoolYears.findFirst({
    columns: { id: true, data_inicio: true, data_fim: true },
    where: eq(schoolYears.ativo, true),
  });

  // Revalida a janela aqui: a Server Action pode ser chamada diretamente,
  // sem passar pela página que já faz essa checagem.
  if (!activeYear || !isWithinWindow(activeYear)) {
    return {
      success: false,
      errors: {
        _form: ["O período de inscrição não está aberto no momento."],
      },
    };
  }

  try {
    const saved = await db.transaction(async (tx) => {
      const [application] = await tx
        .insert(applications)
        .values({
          school_year_id: activeYear.id,
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

interface DocumentRow {
  application_id: string;
  categoria: string;
  student_id: string | null;
  storage_path: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
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
  addDocs(data.pai.documentos, "rg_pai");
  addDocs(data.mae.documentos, "rg_mae");
  if (data.certidao_casamento) addDocs(data.certidao_casamento, "certidao");
  addDocs(data.comprovante_endereco, "comprovante_endereco");
  addDocs(data.extrato_ir, "extrato_ir");
  addDocs(data.extratos_bancarios, "extrato_bancario");

  // `RETURNING` preserva a ordem do insert, então o aluno i corresponde a
  // students[i] — casar por nome vincularia errado alunos homônimos.
  data.alunos.forEach((aluno, i) => {
    addDocs(aluno.documentos, "rg_aluno", students[i]?.id ?? null);
  });

  return rows;
}

async function fillDocumentSizes(documentRows: DocumentRow[]) {
  const storage = getStorage();

  for (const doc of documentRows) {
    doc.tamanho_bytes = (await storage.size(doc.storage_path)) ?? 0;
  }
}

/**
 * Move os arquivos de `pending/{uuid}/` para `applications/{id}/` depois do
 * commit e atualiza a linha correspondente. Se um move ou update falhar, a
 * linha mantém o caminho `pending/` — `getDocumentUrl` no admin resolve os
 * dois caminhos, então o documento segue acessível.
 */
async function moveFilesToApplication(
  documentRows: DocumentRow[],
  appId: string
) {
  const storage = getStorage();

  for (const doc of documentRows) {
    if (!doc.storage_path.startsWith("pending/")) continue;

    const newPath = doc.storage_path.replace(
      /^pending\/[^/]+/,
      `applications/${appId}`
    );

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
