import type { ServerActions } from "@/components/server-actions";
import type { ApplicationSummary } from "../_components/application-card";
import type { SecretariatApplicationSummary } from "./client";

type ApplicationDetailData = NonNullable<Awaited<ReturnType<ServerActions["getApplicationDetail"]>>["data"]>;
type Observation = Awaited<ReturnType<ServerActions["getApplicationObservations"]>>[number];
type IssuedDocument = Awaited<ReturnType<ServerActions["getIssuedDocumentHistory"]>>[number];

const ESCOLA = "Colégio São José — Itatiba";
const SCHOOL_YEAR_ID = "ano-2027";
const ADMIN_ID = "admin-1";

/** Famílias fictícias: o detalhe completo das que os estados abrem. */
export const applicationDetails: Record<string, ApplicationDetailData> = {
  "app-oliveira": {
    id: "app-oliveira",
    school_year_id: SCHOOL_YEAR_ID,
    status: "pendente",
    escola: ESCOLA,
    pai_nome: "Marcos Antônio de Oliveira",
    pai_rg: "34.215.887-1",
    pai_cpf: "318.442.106-50",
    pai_profissao: "Eletricista",
    mae_nome: "Fernanda Lima de Oliveira",
    mae_cpf: "402.187.539-12",
    mae_profissao: "Do lar",
    endereco: "Rua Benedito Pires de Camargo, 412 — Jardim Galetto, Itatiba-SP",
    cep: "13255-180",
    telefone: "(11) 98734-2210",
    email: "fernanda.oliveira@example.com",
    renda_pai: 3200,
    renda_mae: 0,
    renda_outros: 450,
    pessoas_domicilio: 5,
    despesa_aluguel: 1350,
    despesa_servicos: 410,
    despesa_tv: 0,
    despesa_celular_plano: 89.9,
    despesa_celular_parcelas: 0,
    despesa_internet: 99.9,
    desconto_solicitado: 60,
    desconto_concedido: null,
    motivo: null,
    data_envio: "2026-10-28T13:42:00-03:00",
    data_decisao: null,
    decided_by: null,
    students: [
      { id: "st-ana", application_id: "app-oliveira", nome: "Ana Clara de Oliveira", cpf: "551.209.348-77", serie: "6º ano — Ensino Fundamental", mensalidade: 1180 },
      { id: "st-lucas", application_id: "app-oliveira", nome: "Lucas de Oliveira", cpf: null, serie: "3º ano — Ensino Fundamental", mensalidade: 1090 },
    ],
    other_children: [
      { id: "oc-maria", application_id: "app-oliveira", nome: "Maria Luísa de Oliveira", cpf: null, nascimento: "2023-04-17" },
    ],
    vehicles: [{ id: "vh-1", application_id: "app-oliveira", marca: "Fiat", modelo: "Uno Mille", ano: "2009" }],
    collaboration: {
      id: "col-1",
      application_id: "app-oliveira",
      limpeza: true,
      limpeza_vezes_semana: 1,
      mutirao: true,
      mutirao_sabados: 2,
      arrecadacao: false,
      buscar_benfeitores: true,
      outros: null,
    },
    benefactors: [{ id: "bf-1", application_id: "app-oliveira", nome: "José Carlos Bueno", email: "jc.bueno@example.com" }],
    documents: [
      doc("app-oliveira", "dc-1", "declaracao_vaga", "declaracao-vaga-2027.pdf", "application/pdf"),
      doc("app-oliveira", "dc-2", "rg_pai", "rg-marcos.jpg", "image/jpeg"),
      doc("app-oliveira", "dc-3", "rg_mae", "rg-fernanda.jpg", "image/jpeg"),
      doc("app-oliveira", "dc-4", "certidao", "certidao-casamento.pdf", "application/pdf"),
      doc("app-oliveira", "dc-5", "comprovante_endereco", "conta-luz-setembro.pdf", "application/pdf"),
      doc("app-oliveira", "dc-6", "extrato_ir", "declaracao-ir-2026.pdf", "application/pdf"),
      doc("app-oliveira", "dc-7", "extrato_bancario", "extrato-agosto-setembro.pdf", "application/pdf"),
      doc("app-oliveira", "dc-8", "certidao_nascimento_st-lucas", "certidao-lucas.pdf", "application/pdf"),
    ],
  },
  "app-almeida": {
    id: "app-almeida",
    school_year_id: SCHOOL_YEAR_ID,
    status: "aprovada",
    escola: ESCOLA,
    pai_nome: "Roberto Carlos Almeida",
    pai_rg: "28.990.412-6",
    pai_cpf: "276.531.840-33",
    pai_profissao: "Motorista",
    mae_nome: "Patrícia Souza Almeida",
    mae_cpf: "291.604.758-09",
    mae_profissao: "Auxiliar de enfermagem",
    endereco: "Rua Luiz Scavone, 88 — Vila Cassaro, Itatiba-SP",
    cep: "13252-010",
    telefone: "(11) 99512-0476",
    email: "patricia.almeida@example.com",
    renda_pai: 2850,
    renda_mae: 2400,
    renda_outros: null,
    pessoas_domicilio: 4,
    despesa_aluguel: 0,
    despesa_servicos: 380,
    despesa_tv: 49.9,
    despesa_celular_plano: 120,
    despesa_celular_parcelas: 0,
    despesa_internet: 109.9,
    desconto_solicitado: 50,
    desconto_concedido: 50,
    motivo: "Renda compatível com a documentação apresentada.",
    data_envio: "2026-09-22T09:15:00-03:00",
    data_decisao: "2026-10-09T16:20:00-03:00",
    decided_by: ADMIN_ID,
    students: [
      { id: "st-joao", application_id: "app-almeida", nome: "João Pedro Almeida", cpf: "612.884.903-41", serie: "8º ano — Ensino Fundamental", mensalidade: 1240 },
      { id: "st-beatriz", application_id: "app-almeida", nome: "Beatriz Almeida", cpf: null, serie: "1º ano — Ensino Fundamental", mensalidade: 1090 },
    ],
    other_children: [],
    vehicles: [],
    collaboration: {
      id: "col-2",
      application_id: "app-almeida",
      limpeza: false,
      limpeza_vezes_semana: null,
      mutirao: false,
      mutirao_sabados: null,
      arrecadacao: true,
      buscar_benfeitores: false,
      outros: null,
    },
    benefactors: [],
    documents: [
      doc("app-almeida", "da-1", "declaracao_vaga", "declaracao-vaga.pdf", "application/pdf"),
      doc("app-almeida", "da-2", "comprovante_endereco", "comprovante-agua.pdf", "application/pdf"),
      doc("app-almeida", "da-3", "extrato_ir", "ir-2026.pdf", "application/pdf"),
    ],
  },
};

function doc(applicationId: string, id: string, categoria: string, nome_arquivo: string, mime_type: string) {
  return {
    id,
    application_id: applicationId,
    categoria,
    student_id: null,
    storage_path: `applications/${applicationId}/${categoria}/${nome_arquivo}`,
    nome_arquivo,
    mime_type,
    tamanho_bytes: 284_512,
    uploaded_at: "2026-10-28T13:40:00-03:00",
  };
}

function summary(detail: ApplicationDetailData): ApplicationSummary {
  return {
    id: detail.id,
    status: detail.status,
    escola: detail.escola,
    pai_nome: detail.pai_nome,
    mae_nome: detail.mae_nome,
    data_envio: detail.data_envio,
    desconto_solicitado: detail.desconto_solicitado,
    desconto_concedido: detail.desconto_concedido,
    motivo: detail.motivo,
    data_decisao: detail.data_decisao,
    students: detail.students.map(({ id, nome, serie, mensalidade }) => ({ id, nome, serie, mensalidade })),
  };
}

/** Lista da Administração: situações variadas, da mais recente para a mais antiga. */
export const applications: ApplicationSummary[] = [
  summary(applicationDetails["app-oliveira"]),
  {
    id: "app-ribeiro",
    status: "pendente",
    escola: ESCOLA,
    pai_nome: "Paulo Henrique Ribeiro",
    mae_nome: "Juliana Martins Ribeiro",
    data_envio: "2026-10-21T19:05:00-03:00",
    desconto_solicitado: 40,
    students: [{ id: "st-gabriel", nome: "Gabriel Ribeiro", serie: "9º ano — Ensino Fundamental", mensalidade: 1240 }],
  },
  {
    id: "app-santana",
    status: "pendente",
    escola: ESCOLA,
    pai_nome: "Rafael Santana",
    mae_nome: "Camila Ferreira Santana",
    data_envio: "2026-10-15T08:30:00-03:00",
    desconto_solicitado: 50,
    students: [
      { id: "st-tomas", nome: "Tomás Santana", serie: "7º ano — Ensino Fundamental", mensalidade: 1180 },
      { id: "st-cecilia", nome: "Cecília Santana", serie: "4º ano — Ensino Fundamental", mensalidade: 1090 },
      { id: "st-bento", nome: "Bento Santana", serie: "1º ano — Ensino Fundamental", mensalidade: 1090 },
    ],
  },
  summary(applicationDetails["app-almeida"]),
  {
    id: "app-costa",
    status: "aprovada",
    escola: ESCOLA,
    pai_nome: "André Luiz Costa",
    mae_nome: "Renata Prado Costa",
    data_envio: "2026-09-15T14:10:00-03:00",
    desconto_solicitado: 45,
    desconto_concedido: 30,
    motivo: null,
    data_decisao: "2026-10-02T10:45:00-03:00",
    students: [{ id: "st-helena", nome: "Helena Costa", serie: "2º ano — Ensino Médio", mensalidade: 1380 }],
  },
  {
    id: "app-pereira",
    status: "rejeitada",
    escola: ESCOLA,
    pai_nome: "Sérgio Pereira",
    mae_nome: "Luciana Alves Pereira",
    data_envio: "2026-09-10T11:25:00-03:00",
    desconto_solicitado: 80,
    desconto_concedido: null,
    motivo: "Documentação de renda incompleta após dois pedidos de complemento.",
    data_decisao: "2026-09-30T15:00:00-03:00",
    students: [{ id: "st-davi", nome: "Davi Pereira", serie: "5º ano — Ensino Fundamental", mensalidade: 1180 }],
  },
  {
    id: "app-martins",
    status: "aprovada",
    escola: ESCOLA,
    pai_nome: "Eduardo Martins",
    mae_nome: "Aline Rocha Martins",
    data_envio: "2026-08-29T17:50:00-03:00",
    desconto_solicitado: 70,
    desconto_concedido: 70,
    motivo: "Família numerosa com renda per capita abaixo da referência.",
    data_decisao: "2026-09-18T09:30:00-03:00",
    students: [
      { id: "st-isabel", nome: "Isabel Martins", serie: "6º ano — Ensino Fundamental", mensalidade: 1180 },
      { id: "st-francisco", nome: "Francisco Martins", serie: "2º ano — Ensino Fundamental", mensalidade: 1090 },
    ],
  },
];

/** Sem rejeitadas: com o filtro “Rejeitadas” a lista fica vazia e oferece limpar filtros. */
export const applicationsWithoutRejected: ApplicationSummary[] = applications.filter(
  (application) => application.status !== "rejeitada"
);

const CONTACTS: Record<string, { telefone: string; email: string | null }> = {
  "app-oliveira": { telefone: "(11) 98734-2210", email: "fernanda.oliveira@example.com" },
  "app-ribeiro": { telefone: "(11) 97420-8815", email: "juliana.ribeiro@example.com" },
  "app-santana": { telefone: "(11) 99108-3342", email: null },
  "app-almeida": { telefone: "(11) 99512-0476", email: "patricia.almeida@example.com" },
  "app-costa": { telefone: "(11) 98266-1903", email: "renata.costa@example.com" },
  "app-pereira": { telefone: "(11) 97781-4520", email: "luciana.pereira@example.com" },
  "app-martins": { telefone: "(11) 99645-7730", email: "aline.martins@example.com" },
};

/** As mesmas famílias como a Secretaria as recebe: contato e alunos, sem renda nem desconto. */
export const secretariatApplications: SecretariatApplicationSummary[] = applications.map((application) => ({
  id: application.id,
  status: application.status,
  escola: application.escola,
  pai_nome: application.pai_nome,
  mae_nome: application.mae_nome,
  ...CONTACTS[application.id],
  data_decisao: application.data_decisao ?? null,
  students: application.students.map(({ id, nome }) => ({ id, nome })),
}));

export const secretariatApplicationsWithoutRejected: SecretariatApplicationSummary[] = secretariatApplications.filter(
  (application) => application.status !== "rejeitada"
);

/** Observações internas registradas pela Secretaria. */
export const observations: Record<string, Observation[]> = {
  "app-almeida": [
    {
      id: "obs-1",
      body: "Mãe entregou na secretaria a via assinada do contrato.",
      created_at: "2026-10-14T10:12:00-03:00",
      author_user: { id: "sec-1", email: "secretaria@arcansp.org.br" },
    },
    {
      id: "obs-2",
      body: "Pediu para retirar a carta de decisão impressa na próxima reunião de pais.",
      created_at: "2026-10-20T15:40:00-03:00",
      author_user: { id: "sec-1", email: "secretaria@arcansp.org.br" },
    },
  ],
};

const ISSUED_ALMEIDA: IssuedDocument[] = [
  {
    id: "iss-contract-1",
    application_id: "app-almeida",
    kind: "contract",
    version: 1,
    filename: "contrato-almeida-2027.pdf",
    issued_at: "2026-10-09T16:31:00-03:00",
    issued_by: ADMIN_ID,
  },
  {
    id: "iss-decision-2",
    application_id: "app-almeida",
    kind: "decision",
    version: 2,
    filename: "decisao-almeida-2027-v2.pdf",
    issued_at: "2026-10-09T16:28:00-03:00",
    issued_by: ADMIN_ID,
  },
  {
    id: "iss-decision-1",
    application_id: "app-almeida",
    kind: "decision",
    version: 1,
    filename: "decisao-almeida-2027.pdf",
    issued_at: "2026-10-09T16:22:00-03:00",
    issued_by: ADMIN_ID,
  },
];

/** Versão atual de cada documento final, por solicitação. */
export const currentIssuedDocuments: Record<string, IssuedDocument[]> = {
  "app-almeida": ISSUED_ALMEIDA.filter((document) => document.id !== "iss-decision-1"),
};

/** Todas as versões emitidas, por solicitação (somente Administração). */
export const issuedDocumentHistory: Record<string, IssuedDocument[]> = {
  "app-almeida": ISSUED_ALMEIDA,
};
