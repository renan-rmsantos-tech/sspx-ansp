// Dados fictícios para o protótipo. Nomes, valores e datas são ilustrativos.

export type AppStatus = "pendente" | "aprovada" | "rejeitada";

export interface AppFixture {
  id: string;
  familia: string;
  pai: string;
  mae: string;
  escola: string;
  dataEnvio: string;
  status: AppStatus;
  descontoSolicitado: number;
  descontoConcedido?: number;
  dataDecisao?: string;
  motivo?: string;
  alunos: Array<{ nome: string; serie: string; mensalidade: number }>;
  documentos: number;
  telefone: string;
  email: string;
  endereco: string;
  renda: { pai: number; mae: number; outros: number; pessoas: number };
  despesas: Array<[string, number]>;
}

export const APPLICATIONS: AppFixture[] = [
  {
    id: "a1",
    familia: "Família Carvalho",
    pai: "José Carvalho",
    mae: "Teresa Carvalho",
    escola: "Colégio São José — Itatiba",
    dataEnvio: "2026-10-27",
    status: "pendente",
    descontoSolicitado: 50,
    alunos: [
      { nome: "Pedro Carvalho", serie: "6º ano", mensalidade: 1250 },
      { nome: "Ana Carvalho", serie: "3º ano", mensalidade: 1180 },
    ],
    documentos: 5,
    telefone: "(11) 98765-4321",
    email: "familia.carvalho@exemplo.com",
    endereco: "Rua das Palmeiras, 120 — Itatiba/SP",
    renda: { pai: 3200, mae: 1400, outros: 0, pessoas: 5 },
    despesas: [["Aluguel", 1500], ["Serviços", 420], ["Internet", 110], ["Celular (plano)", 90]],
  },
  {
    id: "a2",
    familia: "Família Rezende",
    pai: "Marcos Rezende",
    mae: "Lúcia Rezende",
    escola: "Colégio São José — Itatiba",
    dataEnvio: "2026-10-24",
    status: "pendente",
    descontoSolicitado: 30,
    alunos: [{ nome: "Mateus Rezende", serie: "1ª série EM", mensalidade: 1480 }],
    documentos: 4,
    telefone: "(11) 97654-3210",
    email: "rezende.familia@exemplo.com",
    endereco: "Av. Brasil, 88 — Itatiba/SP",
    renda: { pai: 4100, mae: 0, outros: 600, pessoas: 4 },
    despesas: [["Aluguel", 1300], ["Serviços", 380], ["Internet", 100]],
  },
  {
    id: "a3",
    familia: "Família Nogueira",
    pai: "Antônio Nogueira",
    mae: "Helena Nogueira",
    escola: "Escola Santa Teresinha — Bragança",
    dataEnvio: "2026-10-20",
    status: "aprovada",
    descontoSolicitado: 40,
    descontoConcedido: 35,
    dataDecisao: "2026-10-26",
    motivo: "Renda compatível com desconto parcial.",
    alunos: [{ nome: "Clara Nogueira", serie: "4º ano", mensalidade: 1180 }],
    documentos: 6,
    telefone: "(11) 96543-2109",
    email: "nogueira@exemplo.com",
    endereco: "Rua Minas Gerais, 45 — Bragança Paulista/SP",
    renda: { pai: 2900, mae: 2100, outros: 0, pessoas: 4 },
    despesas: [["Aluguel", 1200], ["Serviços", 350]],
  },
  {
    id: "a4",
    familia: "Família Amaral",
    pai: "Ricardo Amaral",
    mae: "Beatriz Amaral",
    escola: "Colégio São José — Itatiba",
    dataEnvio: "2026-10-15",
    status: "rejeitada",
    descontoSolicitado: 60,
    dataDecisao: "2026-10-22",
    motivo: "Documentação de renda incompleta.",
    alunos: [{ nome: "Luísa Amaral", serie: "8º ano", mensalidade: 1320 }],
    documentos: 2,
    telefone: "(11) 95432-1098",
    email: "amaral@exemplo.com",
    endereco: "Rua do Rosário, 310 — Itatiba/SP",
    renda: { pai: 5200, mae: 3100, outros: 0, pessoas: 3 },
    despesas: [["Serviços", 400], ["Internet", 120]],
  },
  {
    id: "a5",
    familia: "Família Siqueira",
    pai: "Paulo Siqueira",
    mae: "Marta Siqueira",
    escola: "Colégio São José — Itatiba",
    dataEnvio: "2026-10-12",
    status: "aprovada",
    descontoSolicitado: 50,
    descontoConcedido: 50,
    dataDecisao: "2026-10-18",
    alunos: [
      { nome: "Tomás Siqueira", serie: "2º ano", mensalidade: 1180 },
      { nome: "Inês Siqueira", serie: "5º ano", mensalidade: 1250 },
      { nome: "Rafael Siqueira", serie: "9º ano", mensalidade: 1320 },
    ],
    documentos: 7,
    telefone: "(11) 94321-0987",
    email: "siqueira@exemplo.com",
    endereco: "Rua Campinas, 12 — Itatiba/SP",
    renda: { pai: 3600, mae: 0, outros: 0, pessoas: 6 },
    despesas: [["Aluguel", 1400], ["Serviços", 460], ["Internet", 100], ["Celular (plano)", 60]],
  },
];

export interface DonorFixture {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  priorado: string;
  frequencia: "mensal" | "unica";
  valor: number;
  diaVencimento?: number;
  proximoVencimento?: string;
  boasVindas: "enviado" | "pendente";
  boasVindasEm?: string;
  comprovanteMes: "recebido" | "pendente" | "nao_se_aplica";
  cadastro: string;
  observacoes?: string;
}

export const DONORS: DonorFixture[] = [
  { id: "d1", nome: "Maria Aparecida Fonseca", email: "maria.fonseca@exemplo.com", telefone: "(11) 99876-1234", cpf: "***.456.789-**", priorado: "Priorado São Pio X — São Paulo", frequencia: "mensal", valor: 150, diaVencimento: 10, proximoVencimento: "2026-11-10", boasVindas: "enviado", boasVindasEm: "2026-09-02", comprovanteMes: "recebido", cadastro: "2026-09-01" },
  { id: "d2", nome: "Carlos Eduardo Pires", email: "carlos.pires@exemplo.com", telefone: "(19) 98765-5678", cpf: "***.321.654-**", priorado: "Capela N. S. do Rosário — Campinas", frequencia: "mensal", valor: 300, diaVencimento: 5, proximoVencimento: "2026-11-05", boasVindas: "pendente", comprovanteMes: "pendente", cadastro: "2026-10-26", observacoes: "Prefere contato por WhatsApp à tarde." },
  { id: "d3", nome: "Ana Lúcia Bertolini", email: "ana.bertolini@exemplo.com", telefone: "(11) 97654-9012", cpf: "***.789.123-**", priorado: "Priorado São Pio X — São Paulo", frequencia: "unica", valor: 1000, boasVindas: "enviado", boasVindasEm: "2026-10-12", comprovanteMes: "nao_se_aplica", cadastro: "2026-10-11" },
  { id: "d4", nome: "Francisco Xavier Lima", email: "fx.lima@exemplo.com", telefone: "(11) 96543-3456", cpf: "***.147.258-**", priorado: "Capela Santa Teresinha — Itatiba", frequencia: "mensal", valor: 80, diaVencimento: 20, proximoVencimento: "2026-11-20", boasVindas: "pendente", comprovanteMes: "pendente", cadastro: "2026-10-28" },
    { id: "d5", nome: "Regina Célia Marques", email: "regina.marques@exemplo.com", telefone: "(11) 95432-7890", cpf: "***.369.258-**", priorado: "Capela Santa Teresinha — Itatiba", frequencia: "mensal", valor: 200, diaVencimento: 15, proximoVencimento: "2026-11-15", boasVindas: "enviado", boasVindasEm: "2026-08-16", comprovanteMes: "recebido", cadastro: "2026-08-15" },
  { id: "d6", nome: "João Batista Ferreira", email: "jb.ferreira@exemplo.com", telefone: "(11) 94321-2345", cpf: "***.852.741-**", priorado: "Priorado São Pio X — São Paulo", frequencia: "unica", valor: 500, boasVindas: "enviado", boasVindasEm: "2026-07-03", comprovanteMes: "nao_se_aplica", cadastro: "2026-07-02" },
];

export interface PaymentFixture {
  id: string;
  benfeitor: string;
  frequencia: "mensal" | "unica";
  vencimento: string;
  esperado: number;
  recebido: number;
  estado: "aguardando" | "confirmado" | "nao_identificado";
  comprovante: "enviado" | "pendente" | "anexado";
}

export const PAYMENTS: PaymentFixture[] = [
  { id: "p1", benfeitor: "Maria Aparecida Fonseca", frequencia: "mensal", vencimento: "2026-10-10", esperado: 150, recebido: 150, estado: "confirmado", comprovante: "enviado" },
  { id: "p2", benfeitor: "Carlos Eduardo Pires", frequencia: "mensal", vencimento: "2026-10-05", esperado: 300, recebido: 0, estado: "aguardando", comprovante: "pendente" },
  { id: "p3", benfeitor: "Regina Célia Marques", frequencia: "mensal", vencimento: "2026-10-15", esperado: 200, recebido: 200, estado: "confirmado", comprovante: "enviado" },
  { id: "p4", benfeitor: "Francisco Xavier Lima", frequencia: "mensal", vencimento: "2026-10-20", esperado: 80, recebido: 0, estado: "aguardando", comprovante: "pendente" },
  { id: "p5", benfeitor: "Ana Lúcia Bertolini", frequencia: "unica", vencimento: "2026-10-11", esperado: 1000, recebido: 0, estado: "aguardando", comprovante: "anexado" },
];

export const SCHOOL_YEARS = [
  { id: "y1", nome: "2026", inicio: "2026-02-02", fim: "2026-12-18", ativo: true },
  { id: "y2", nome: "2025", inicio: "2025-02-03", fim: "2025-12-19", ativo: false },
];

export const STAFF_USERS = [
  { id: "u1", email: "secretaria@colegiosaojose.exemplo", ativo: true, criado: "2026-03-10" },
  { id: "u2", email: "tesouraria@colegiosaojose.exemplo", ativo: false, criado: "2025-11-02" },
];

export const DECISION_TOKENS = [
  ["{nome_pai}", "Nome do pai ou responsável"],
  ["{nome_mae}", "Nome da mãe"],
  ["{escola}", "Nome da escola"],
  ["{aluno}", "Nome(s) do(s) aluno(s)"],
  ["{desconto}", "Desconto concedido (%)"],
  ["{data}", "Data da decisão"],
  ["{motivo}", "Motivo da decisão"],
  ["{ano_letivo}", "Ano letivo"],
] as const;

export const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
