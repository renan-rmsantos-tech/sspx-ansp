import type { UploadedFile } from "./file-upload";

export interface OtherChild {
  nome: string;
  cpf: string;
  nascimento: string;
}

export interface Student {
  nome: string;
  cpf: string;
  serie: string;
  mensalidade: string;
  docRg: UploadedFile[];
  docCertidao: UploadedFile[];
}

export interface Vehicle {
  marca: string;
  modelo: string;
  ano: string;
}

export interface Benefactor {
  nome: string;
  email: string;
}

export interface Collaboration {
  limpeza: boolean;
  limpeza_vezes_semana: string;
  mutirao: boolean;
  mutirao_sabados: string;
  arrecadacao: boolean;
  benfeitores: boolean;
  outros: string;
}

export interface FormData {
  escola: string;
  declaracao_vaga: UploadedFile[];
  pai_nome: string;
  pai_rg: string;
  pai_cpf: string;
  pai_profissao: string;
  doc_pai: UploadedFile[];
  mae_nome: string;
  mae_cpf: string;
  mae_profissao: string;
  doc_mae: UploadedFile[];
  certidao_casamento: UploadedFile[];
  endereco: string;
  cep: string;
  telefone: string;
  email: string;
  comprovante_endereco: UploadedFile[];
  outros_filhos: OtherChild[];
  alunos: Student[];
  desconto_solicitado: string;
  renda_pai: string;
  renda_mae: string;
  renda_outros: string;
  pessoas_domicilio: string;
  extrato_ir: UploadedFile[];
  despesa_aluguel: string;
  despesa_servicos: string;
  despesa_tv: string;
  despesa_celular_plano: string;
  despesa_celular_parcelas: string;
  despesa_internet: string;
  extratos_bancarios: UploadedFile[];
  veiculos: Vehicle[];
  colaboracao: Collaboration;
  indicacao_benfeitores: Benefactor[];
}

export const INITIAL_FORM_DATA: FormData = {
  // Por enquanto há apenas uma escola; o campo deixou de ser escolhido no
  // formulário e usa este valor padrão. Futuramente poderá voltar a ser select.
  escola: "Colégio São José",
  declaracao_vaga: [],
  pai_nome: "",
  pai_rg: "",
  pai_cpf: "",
  pai_profissao: "",
  doc_pai: [],
  mae_nome: "",
  mae_cpf: "",
  mae_profissao: "",
  doc_mae: [],
  certidao_casamento: [],
  endereco: "",
  cep: "",
  telefone: "",
  email: "",
  comprovante_endereco: [],
  outros_filhos: [],
  alunos: [
    {
      nome: "",
      cpf: "",
      serie: "",
      mensalidade: "",
      docRg: [],
      docCertidao: [],
    },
  ],
  desconto_solicitado: "0",
  renda_pai: "",
  renda_mae: "",
  renda_outros: "",
  pessoas_domicilio: "",
  extrato_ir: [],
  despesa_aluguel: "",
  despesa_servicos: "",
  despesa_tv: "",
  despesa_celular_plano: "",
  despesa_celular_parcelas: "",
  despesa_internet: "",
  extratos_bancarios: [],
  veiculos: [],
  colaboracao: {
    limpeza: false,
    limpeza_vezes_semana: "",
    mutirao: false,
    mutirao_sabados: "",
    arrecadacao: false,
    benfeitores: false,
    outros: "",
  },
  indicacao_benfeitores: Array.from({ length: 10 }, () => ({
    nome: "",
    email: "",
  })),
};

export const SERIES_OPTIONS = [
  "Maternal",
  "Jardim I",
  "Jardim II",
  "Jardim III",
  "1º Ano",
  "2º Ano",
  "3º Ano",
  "4º Ano",
  "5º Ano",
  "6º Ano",
  "7º Ano",
  "8º Ano",
  "9º Ano",
  "1º EM",
  "2º EM",
  "3º EM",
];

// Aceita os formatos comuns em pt-BR: "1.234,56", "1234,56", "1234.56".
// O último separador (vírgula ou ponto) é tratado como decimal; os demais são
// separadores de milhar e são descartados.
export function parseMoney(value: string): number {
  if (!value) return 0;

  const cleaned = value.replace(/[^\d,.-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  // Sem separador, ou um "." seguido de exatamente 3 dígitos no fim ("1.500"):
  // em pt-BR isso é milhar, não decimal.
  const isThousandsDot =
    decimalIndex === lastDot &&
    lastComma === -1 &&
    cleaned.length - lastDot === 4;

  if (decimalIndex === -1 || isThousandsDot) {
    return parseFloat(cleaned.replace(/[.,]/g, "")) || 0;
  }

  const integerPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "");
  const decimalPart = cleaned.slice(decimalIndex + 1);

  return parseFloat(`${integerPart}.${decimalPart}`) || 0;
}

export function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}
