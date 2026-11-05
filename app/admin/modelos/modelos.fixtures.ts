import type { ContractTemplate } from "../_actions/admin-actions";
import type { TemplateData } from "../_components/template-editor";

const HEADER = "Arca Nossa Senhora da Providência\nComissão de Bolsas de Estudo";
const FOOTER = "Atenciosamente,\nComissão de Bolsas — Arca N. S. da Providência\n{data}";

export const decisionTemplates: TemplateData[] = [
  {
    id: "3e1f6a20-8b4c-4d71-9e02-5a6b7c8d9e01",
    tipo: "aprovacao",
    cabecalho: HEADER,
    corpo:
      "Prezado(a) Sr(a). {nome_pai} e Sra. {nome_mae},\n\nTemos a satisfação de comunicar que a solicitação de bolsa de estudo para o(a) aluno(a) {aluno}, na escola {escola}, foi APROVADA para o ano letivo de {ano_letivo}.\n\nFoi concedido um desconto de {desconto}% sobre o valor da mensalidade.\n\n{motivo}\n\nSolicitamos que compareçam à secretaria da escola para formalizar a matrícula.",
    rodape: FOOTER,
  },
  {
    id: "4f2a7b31-9c5d-4e82-8f13-6b7c8d9e0f12",
    tipo: "rejeicao",
    cabecalho: HEADER,
    corpo:
      "Prezado(a) Sr(a). {nome_pai} e Sra. {nome_mae},\n\nApós análise cuidadosa, informamos que a solicitação de bolsa de estudo para o(a) aluno(a) {aluno}, na escola {escola}, não pôde ser atendida para o ano letivo de {ano_letivo}.\n\n{motivo}\n\nA família poderá reapresentar a solicitação no próximo período de inscrições.",
    rodape: FOOTER,
  },
];

export const contractTemplate: ContractTemplate = {
  id: "5a3b8c42-0d6e-4f93-9a24-7c8d9e0f1a23",
  titulo: "CONTRATO DE CONCESSÃO DE BOLSA DE ESTUDOS",
  cabecalho:
    "PARTES\n\nCONCEDENTE: Arca Nossa Senhora da Providência, civilmente registrada como ACIPEC ASSOCIACAO CIVIL PARA EDUCACAO CATOLICA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 42.736.079/0001-63, neste ato representada por seu representante legal.\n\nBENEFICIÁRIO: {aluno}, neste ato representado(a) por seu Responsável Legal, {nome_responsavel}, portador(a) do RG nº {rg_responsavel} e inscrito(a) no CPF sob o nº {cpf_responsavel}, residente e domiciliado(a) em {endereco}.",
  clausulas: [
    {
      titulo: "CLÁUSULA PRIMEIRA – DO OBJETO E DO PERCENTUAL DA BOLSA",
      corpo:
        "1.1. O presente contrato tem por objeto a concessão de uma bolsa de estudos para o ano letivo de {ano_letivo}, destinada ao custeio parcial ou integral das mensalidades escolares do Beneficiário.\n1.2. O percentual concedido a título de bolsa de estudos será de {desconto}% do valor da mensalidade escolar da série em que o aluno estiver matriculado.",
    },
    {
      titulo: "CLÁUSULA SEGUNDA – DO PRAZO DE VIGÊNCIA",
      corpo:
        "2.1. A bolsa de estudos é concedida pelo prazo de 1 (um) ano letivo, iniciando-se em {data_inicio} e encerrando-se em {data_termino}, sem renovação automática para os anos subsequentes.",
    },
    {
      titulo: "CLÁUSULA TERCEIRA – DO FORO",
      corpo:
        "3.1. Para dirimir quaisquer dúvidas decorrentes deste instrumento, as partes elegem o foro da comarca de Itatiba - SP, com renúncia expressa a qualquer outro.",
    },
  ],
  rodape:
    "Por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor.\n\n{data_extenso}\n\n\n_____________________________________________\nArca Nossa Senhora da Providência — Concedente\n\n\n_____________________________________________\n{nome_responsavel} — Responsável pelo Beneficiário",
};
