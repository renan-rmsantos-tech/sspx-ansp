/**
 * Bootstrap idempotente do banco, executado a cada start (ver `npm start`).
 *
 * Cria o admin inicial a partir de ADMIN_EMAIL/ADMIN_PASSWORD e insere os
 * registros que a aplicação espera encontrar já existindo (modelos de decisão,
 * contrato e e-mail, cabeçalho dos documentos, ano letivo). Nada é
 * sobrescrito: rodar de novo em um banco já populado não altera nada.
 */
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db";
import {
  adminUsers,
  contractTemplates,
  decisionTemplates,
  documentHeader,
  donorWelcomeTemplates,
  schoolYears,
} from "../lib/db/schema";
import {
  DONOR_WELCOME_BODY,
  DONOR_WELCOME_SUBJECT,
} from "../lib/email/donor-welcome-template";

function log(message: string) {
  console.log(`[bootstrap] ${message}`);
}

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    log("ADMIN_EMAIL/ADMIN_PASSWORD não definidos — nenhum admin criado.");
    return;
  }

  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  if (existing) {
    log(`admin ${email} já existe — senha preservada.`);
    return;
  }

  await db
    .insert(adminUsers)
    .values({
      email,
      password_hash: await hashPassword(password),
      role: "admin",
      ativo: true,
    });

  log(`admin ${email} criado.`);
}

const DECISION_TEMPLATES = [
  {
    tipo: "aprovacao",
    cabecalho:
      "Arca Nossa Senhora da Providência\nComissão de Bolsas de Estudo",
    corpo:
      "Prezado(a) Sr(a). {nome_pai} e Sra. {nome_mae},\n\nTemos a satisfação de comunicar que a solicitação de bolsa de estudo para o(a) aluno(a) {aluno}, na escola {escola}, foi APROVADA para o ano letivo de {ano_letivo}.\n\nFoi concedido um desconto de {desconto}% sobre o valor da mensalidade.\n\n{motivo}\n\nSolicitamos que compareçam à secretaria da escola para formalizar a matrícula.",
    rodape:
      "Atenciosamente,\nComissão de Bolsas — Arca N. S. da Providência\n{data}",
  },
  {
    tipo: "rejeicao",
    cabecalho:
      "Arca Nossa Senhora da Providência\nComissão de Bolsas de Estudo",
    corpo:
      "Prezado(a) Sr(a). {nome_pai} e Sra. {nome_mae},\n\nApós análise cuidadosa, informamos que a solicitação de bolsa de estudo para o(a) aluno(a) {aluno}, na escola {escola}, não pôde ser atendida para o ano letivo de {ano_letivo}.\n\n{motivo}\n\nA família poderá reapresentar a solicitação no próximo período de inscrições.",
    rodape:
      "Atenciosamente,\nComissão de Bolsas — Arca N. S. da Providência\n{data}",
  },
] as const;

async function bootstrapDecisionTemplates() {
  for (const template of DECISION_TEMPLATES) {
    const existing = await db.query.decisionTemplates.findFirst({
      where: eq(decisionTemplates.tipo, template.tipo),
    });

    if (existing) continue;

    await db.insert(decisionTemplates).values(template);
    log(`modelo de decisão '${template.tipo}' criado.`);
  }
}

const CONTRACT_CABECALHO = `PARTES

CONCEDENTE: Arca Nossa Senhora da Providência, civilmente registrada como ACIPEC ASSOCIACAO CIVIL PARA EDUCACAO CATOLICA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 42.736.079/0001-63, com sede na Rua Maurício F. Klabin, 223, Vila Mariana, na Capital do Estado de São Paulo, CEP 04120-020, neste ato representada por seu representante legal.

BENEFICIÁRIO: {aluno}, menor impúbere/púbere, neste ato representado(a) por seu Responsável Legal, {nome_responsavel}, portador(a) do RG nº {rg_responsavel} e inscrito(a) no CPF sob o nº {cpf_responsavel}, residente e domiciliado(a) em {endereco}.`;

const CONTRACT_CLAUSULAS = [
  {
    titulo: "CLÁUSULA PRIMEIRA – DO OBJETO E DO PERCENTUAL DA BOLSA",
    corpo:
      "1.1. O presente contrato tem por objeto a concessão de uma bolsa de estudos para o ano letivo de {ano_letivo}, destinada ao custeio parcial ou integral das mensalidades escolares do Beneficiário.\n1.2. Fica estabelecido que o percentual concedido a título de bolsa de estudos será de {desconto}% do valor da mensalidade escolar da série em que o aluno estiver devidamente matriculado.",
  },
  {
    titulo: "CLÁUSULA SEGUNDA – DO DESTINO DOS RECURSOS E ESCOLAS FILIADAS",
    corpo:
      "2.1. O repasse financeiro correspondente ao percentual da bolsa será efetuado diretamente à instituição de ensino, mediante faturamento ou repasse interno, não sendo, em hipótese alguma, entregue em dinheiro ou espécie ao Beneficiário ou ao seu Responsável Legal.\n2.2. Restrição de Rede: O pagamento e o benefício previstos neste contrato são válidos exclusivamente para instituições de ensino devidamente filiadas à Concedente (Arca Nossa Senhora da Providência). Caso o Beneficiário seja transferido para uma escola não filiada, o presente contrato será rescindido automaticamente, cessando o direito à bolsa.",
  },
  {
    titulo: "CLÁUSULA TERCEIRA – DO PRAZO DE VIGÊNCIA",
    corpo:
      "3.1. A presente bolsa de estudos é concedida pelo prazo determinado de 1 (um) ano letivo, iniciando-se em {data_inicio} e encerrando-se em {data_termino}, sem qualquer garantia ou obrigatoriedade de renovação automática para os anos subsequentes.",
  },
  {
    titulo: "CLÁUSULA QUARTA – DA PERDA DA BOLSA POR FALTA GRAVE",
    corpo:
      "4.1. O Beneficiário poderá perder o direito à bolsa de estudos a qualquer momento, de forma imediata, caso cometa uma falta grave, conforme os critérios estabelecidos no Regimento Interno da escola ou pela legislação vigente.\n4.2. Para fins deste contrato, consideram-se faltas graves, entre outras: atos de indisciplina reiterada, violência física ou verbal; danos intencionais ao patrimônio da escola; desrespeito grave aos professores, funcionários ou colegas; frequência escolar inferior à exigida por lei (75%), salvo justificativa médica comprovada; desempenho acadêmico manifestamente insuficiente por desinteresse manifesto do aluno; ou qualquer falta grave ao regulamento interno da instituição de ensino.\n4.3. A ocorrência da falta grave será apurada pela direção da escola filiada e comunicada à Concedente, que notificará o Responsável Legal sobre o cancelamento imediato do benefício.",
  },
  {
    titulo: "CLÁUSULA QUINTA – DO FORO",
    corpo:
      "5.1. Para dirimir quaisquer dúvidas decorrentes deste instrumento, as partes elegem o foro da comarca de Itatiba - SP, com renúncia expressa a qualquer outro.",
  },
];

const CONTRACT_RODAPE = `Por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor.

{data_extenso}


_____________________________________________
Arca Nossa Senhora da Providência — Concedente


_____________________________________________
{nome_responsavel} — Responsável pelo Beneficiário`;

async function bootstrapContractTemplate() {
  const existing = await db.query.contractTemplates.findFirst();

  if (existing) return;

  await db.insert(contractTemplates).values({
    titulo: "CONTRATO DE CONCESSÃO DE BOLSA DE ESTUDOS",
    cabecalho: CONTRACT_CABECALHO,
    clausulas: CONTRACT_CLAUSULAS,
    rodape: CONTRACT_RODAPE,
  });

  log("modelo de contrato criado.");
}

async function bootstrapDocumentHeader() {
  const existing = await db.query.documentHeader.findFirst();

  if (existing) return;

  await db.insert(documentHeader).values({
    linha1: "Arca Nossa Senhora da Providência",
    linha2: "Mantenedora do Colégio São José — Itatiba/SP",
    linha3: "",
  });

  log("cabeçalho dos documentos criado.");
}

async function bootstrapDonorWelcomeTemplate() {
  const existing = await db.query.donorWelcomeTemplates.findFirst();
  if (existing) return;

  await db.insert(donorWelcomeTemplates).values({
    assunto: DONOR_WELCOME_SUBJECT,
    corpo: DONOR_WELCOME_BODY,
  });
  log("modelo de e-mail para benfeitores criado.");
}

async function bootstrapSchoolYear() {
  const existing = await db.query.schoolYears.findFirst();

  if (existing) return;

  await db.insert(schoolYears).values({
    nome: "2026",
    data_inicio: "2026-06-01",
    data_fim: "2026-08-31",
    ativo: true,
  });

  log("ano letivo 2026 criado e ativado.");
}

async function main() {
  await bootstrapAdmin();
  await bootstrapDecisionTemplates();
  await bootstrapContractTemplate();
  await bootstrapDocumentHeader();
  await bootstrapDonorWelcomeTemplate();
  await bootstrapSchoolYear();
  log("concluído.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[bootstrap] falhou:", error);
    process.exit(1);
  });
