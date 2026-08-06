/**
 * Priorados e Capelas da Casa Autônoma do Brasil (FSSPX).
 * Fonte: https://fsspx.com.br/pt/priorados-e-capelas-51589
 */

export interface PrioradoCapelaOption {
  value: string;
  label: string;
}

export interface PrioradoCapelaGroup {
  estado: string;
  options: PrioradoCapelaOption[];
}

export const PRIORADO_NENHUMA = "nenhuma";

export const PRIORADOS_CAPELAS_GROUPS: PrioradoCapelaGroup[] = [
  {
    estado: "São Paulo",
    options: [
      {
        value: "sp-sao-paulo-padre-anchieta",
        label: "Priorado Padre Anchieta – Capela São Pio X (São Paulo)",
      },
      {
        value: "sp-aruja-casa-dom-vital",
        label: "Casa Dom Vital – Capela Nossa Senhora das Dores (Arujá)",
      },
      {
        value: "sp-indaiatuba-imaculada-conceicao",
        label: "Capela Imaculada Conceição (Indaiatuba)",
      },
      {
        value: "sp-itapetininga-sao-jose",
        label: "Capela São José (Itapetininga)",
      },
      {
        value: "sp-cravinhos-santo-antonio",
        label: "Capela Santo Antônio (Cravinhos)",
      },
      {
        value: "sp-sorocaba-menino-jesus",
        label: "Oratório Menino Jesus de Praga (Sorocaba)",
      },
    ],
  },
  {
    estado: "Rio Grande do Sul",
    options: [
      {
        value: "rs-santa-maria-imaculado-coracao",
        label:
          "Priorado do Imaculado Coração de Maria – Igreja do Imaculado Coração de Maria (Santa Maria)",
      },
      {
        value: "rs-porto-alegre-sao-jose",
        label: "Capela São José (Porto Alegre)",
      },
    ],
  },
  {
    estado: "Rio de Janeiro",
    options: [
      {
        value: "rj-bom-jesus-sao-sebastiao",
        label: "Priorado São Sebastião – Igreja São Sebastião (Bom Jesus do Itabapoana)",
      },
      {
        value: "rj-varre-sai-ns-rosario",
        label: "Capela Nossa Senhora do Rosário de Fátima (Varre-Sai)",
      },
      {
        value: "rj-campos-dos-goytacazes",
        label: "Capela (Campos dos Goytacazes)",
      },
      {
        value: "rj-rio-sao-miguel",
        label: "Capela São Miguel (Rio de Janeiro)",
      },
      {
        value: "rj-niteroi-ns-conceicao",
        label: "Capela Nossa Senhora da Conceição (Niterói)",
      },
    ],
  },
  {
    estado: "Paraná",
    options: [
      {
        value: "pr-curitiba-sagrada-familia",
        label: "Capela Sagrada Família (Curitiba)",
      },
    ],
  },
  {
    estado: "Santa Catarina",
    options: [
      {
        value: "sc-penha",
        label: "Missa (Penha)",
      },
    ],
  },
  {
    estado: "Mato Grosso",
    options: [
      {
        value: "mt-cuiaba-sao-pedro",
        label: "Capela São Pedro de Alcântara (Cuiabá)",
      },
    ],
  },
  {
    estado: "Mato Grosso do Sul",
    options: [
      {
        value: "ms-campo-grande-sao-pio-x",
        label: "Capela São Pio X (Campo Grande)",
      },
    ],
  },
  {
    estado: "Minas Gerais",
    options: [
      {
        value: "mg-belo-horizonte",
        label: "Missa (Belo Horizonte)",
      },
      {
        value: "mg-passos",
        label: "Missa (Passos)",
      },
    ],
  },
  {
    estado: "Ceará",
    options: [
      {
        value: "ce-fortaleza-ns-assuncao",
        label: "Capela Nossa Senhora da Assunção (Fortaleza)",
      },
    ],
  },
  {
    estado: "Piauí",
    options: [
      {
        value: "pi-parnaiba-santo-agostinho",
        label: "Capela Santo Agostinho (Parnaíba)",
      },
      {
        value: "pi-teresina-ns-fatima",
        label: "Capela Nossa Senhora de Fátima (Teresina)",
      },
    ],
  },
  {
    estado: "Goiás",
    options: [
      {
        value: "go-anapolis-ns-rosario",
        label: "Instituto Nossa Senhora do Rosário (Anápolis)",
      },
    ],
  },
  {
    estado: "Maranhão",
    options: [
      {
        value: "ma-sao-luis-sao-jose",
        label: "Capela São José da Providência (São Luís)",
      },
    ],
  },
];

const ALL_VALUES = new Set([
  PRIORADO_NENHUMA,
  ...PRIORADOS_CAPELAS_GROUPS.flatMap((g) => g.options.map((o) => o.value)),
]);

export const PRIORADO_CAPELA_VALUES = [...ALL_VALUES] as [string, ...string[]];

const LABEL_BY_VALUE = new Map<string, string>([
  [PRIORADO_NENHUMA, "Nenhuma"],
  ...PRIORADOS_CAPELAS_GROUPS.flatMap((g) =>
    g.options.map((o): [string, string] => [o.value, o.label])
  ),
]);

export function isValidPrioradoCapela(value: string): boolean {
  return ALL_VALUES.has(value);
}

export function prioradoCapelaLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return LABEL_BY_VALUE.get(value) ?? value;
}
