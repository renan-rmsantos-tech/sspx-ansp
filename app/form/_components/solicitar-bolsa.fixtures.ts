import { MSG_OBRIGATORIO } from "./field-ui";
import type { UploadedFile } from "./file-upload";
import { INITIAL_FORM_DATA, type FormData } from "./form-types";

function uploaded(name: string): UploadedFile[] {
  return [{ id: `fixture-${name}`, name, path: `pending/00000000-0000-4000-8000-000000000000/${name}` }];
}

const BENFEITORES = [
  "Antônio Ferreira",
  "Beatriz Lopes",
  "Carlos Menezes",
  "Doroteia Ramos",
  "Eduardo Prado",
  "Fátima Albuquerque",
  "Geraldo Nunes",
  "Helena Teixeira",
  "Inácio Barros",
  "Joana Siqueira",
];

/** Uma família fictícia com todas as etapas preenchidas, para as etapas 2 a 6. */
export const filledFormData: FormData = {
  ...INITIAL_FORM_DATA,
  declaracao_vaga: uploaded("declaracao-vaga.pdf"),
  pai_nome: "José Carlos de Almeida",
  pai_rg: "12.345.678-9",
  pai_cpf: "529.982.247-25",
  pai_profissao: "Marceneiro",
  doc_pai: uploaded("rg-pai.jpg"),
  mae_nome: "Maria Aparecida de Almeida",
  mae_cpf: "111.444.777-35",
  mae_profissao: "Costureira",
  doc_mae: uploaded("rg-mae.jpg"),
  certidao_casamento: uploaded("certidao-casamento.pdf"),
  endereco: "Rua das Palmeiras, 120, Centro, Itatiba — SP",
  cep: "13250-000",
  telefone: "(11) 98765-4321",
  email: "familia.almeida@example.com",
  comprovante_endereco: uploaded("conta-de-luz.pdf"),
  outros_filhos: [{ nome: "Pedro de Almeida", cpf: "123.456.789-09", nascimento: "2021-03-14" }],
  alunos: [
    {
      nome: "Ana Clara de Almeida",
      cpf: "390.533.447-05",
      serie: "5º Ano",
      mensalidade: "1.200,00",
      docRg: uploaded("rg-ana-clara.jpg"),
      docCertidao: uploaded("certidao-ana-clara.pdf"),
    },
  ],
  desconto_solicitado: "50",
  renda_pai: "3.200,00",
  renda_mae: "1.400,00",
  renda_outros: "",
  pessoas_domicilio: "5",
  extrato_ir: uploaded("declaracao-ir-2026.pdf"),
  despesa_aluguel: "1.100,00",
  despesa_servicos: "380,00",
  despesa_tv: "",
  despesa_celular_plano: "90,00",
  despesa_celular_parcelas: "",
  despesa_internet: "100,00",
  extratos_bancarios: uploaded("extrato-bancario-outubro.pdf"),
  veiculos: [{ marca: "Fiat", modelo: "Uno", ano: "2012" }],
  colaboracao: {
    limpeza: true,
    limpeza_vezes_semana: "1",
    mutirao: true,
    mutirao_sabados: "2",
    arrecadacao: false,
    benfeitores: true,
    outros: "",
  },
  indicacao_benfeitores: BENFEITORES.map((nome) => ({
    nome,
    email: `${nome.split(" ")[0].normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()}@example.com`,
  })),
};

/** Os erros que a etapa 1 mostra ao avançar com o formulário vazio. */
export const emptyStep1Errors: Record<string, string> = Object.fromEntries(
  [
    "declaracao_vaga",
    "pai_nome",
    "pai_rg",
    "pai_cpf",
    "pai_profissao",
    "doc_pai",
    "mae_nome",
    "mae_cpf",
    "mae_profissao",
    "doc_mae",
    "certidao_casamento",
    "endereco",
    "cep",
    "telefone",
    "email",
    "comprovante_endereco",
  ].map((field) => [field, MSG_OBRIGATORIO])
);

/** Ano letivo inativo com inscrições futuras já cadastradas. */
export const upcomingSchoolYear = { nome: "2027", data_inicio: "2026-11-16", data_fim: "2026-12-18" };
