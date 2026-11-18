import { desc, relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { ContractClause } from "@/lib/templates/contract-tokens";

// Os campos TypeScript usam o mesmo nome das colunas (snake_case) porque as
// server actions devolvem as linhas direto para os componentes e para os PDFs.

/** Contas do painel administrativo (substitui o Supabase Auth). */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").$type<"admin" | "secretaria">().notNull().default("admin"),
  ativo: boolean("ativo").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
}, (t) => [
  check("admin_users_role_check", sql`${t.role} in ('admin', 'secretaria')`),
]);

export const schoolYears = pgTable(
  "school_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    data_inicio: date("data_inicio", { mode: "string" }).notNull(),
    data_fim: date("data_fim", { mode: "string" }).notNull(),
    ativo: boolean("ativo").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("school_years_only_one_active")
      .on(t.ativo)
      .where(sql`${t.ativo} = true`),
  ]
);

/**
 * Conta do solicitante de bolsa. Separada de `admin_users`: o solicitante só
 * enxerga a própria solicitação e nunca entra no /admin.
 */
export const applicantAccounts = pgTable(
  "applicant_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Sempre em minúsculas e sem espaços nas pontas. */
    email: text("email").notNull(),
    password_hash: text("password_hash").notNull(),
    email_verified_at: timestamp("email_verified_at", { withTimezone: true, mode: "string" }),
    /** Incrementa ao trocar a senha; invalida as sessões abertas antes. */
    session_version: integer("session_version").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("applicant_accounts_email_idx").on(t.email)]
);

/** Links de uso único enviados por e-mail; só o hash SHA-256 do token é guardado. */
export const applicantTokens = pgTable(
  "applicant_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => applicantAccounts.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"verify_email" | "reset_password">().notNull(),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    used_at: timestamp("used_at", { withTimezone: true, mode: "string" }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("applicant_tokens_hash_idx").on(t.token_hash),
    index("applicant_tokens_account_kind_idx").on(t.account_id, t.kind, t.created_at),
    check("applicant_tokens_kind_check", sql`${t.kind} in ('verify_email', 'reset_password')`),
  ]
);

/** Rascunho do formulário de bolsa: um por conta e ano letivo, apagado no envio. */
export const applicationDrafts = pgTable(
  "application_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => applicantAccounts.id, { onDelete: "cascade" }),
    school_year_id: uuid("school_year_id")
      .notNull()
      .references(() => schoolYears.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    current_step: integer("current_step").notNull().default(1),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("application_drafts_account_year_idx").on(t.account_id, t.school_year_id)]
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    school_year_id: uuid("school_year_id")
      .notNull()
      .references(() => schoolYears.id),
    /** Conta que enviou; nulo nas solicitações anteriores ao login de solicitantes. */
    applicant_account_id: uuid("applicant_account_id").references(() => applicantAccounts.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<"pendente" | "aprovada" | "rejeitada">()
      .notNull()
      .default("pendente"),
    escola: text("escola").notNull(),
    pai_nome: text("pai_nome").notNull(),
    pai_rg: text("pai_rg").notNull(),
    pai_cpf: text("pai_cpf").notNull(),
    pai_profissao: text("pai_profissao"),
    mae_nome: text("mae_nome").notNull(),
    mae_cpf: text("mae_cpf").notNull(),
    mae_profissao: text("mae_profissao"),
    endereco: text("endereco").notNull(),
    cep: text("cep"),
    telefone: text("telefone").notNull(),
    email: text("email"),
    renda_pai: numeric("renda_pai", { precision: 12, scale: 2, mode: "number" }),
    renda_mae: numeric("renda_mae", { precision: 12, scale: 2, mode: "number" }),
    renda_outros: numeric("renda_outros", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    pessoas_domicilio: integer("pessoas_domicilio").notNull(),
    despesa_aluguel: numeric("despesa_aluguel", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    despesa_servicos: numeric("despesa_servicos", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    despesa_tv: numeric("despesa_tv", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    despesa_celular_plano: numeric("despesa_celular_plano", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    despesa_celular_parcelas: numeric("despesa_celular_parcelas", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    despesa_internet: numeric("despesa_internet", {
      precision: 12,
      scale: 2,
      mode: "number",
    }),
    desconto_solicitado: numeric("desconto_solicitado", {
      precision: 5,
      scale: 2,
      mode: "number",
    }).notNull(),
    desconto_concedido: numeric("desconto_concedido", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    motivo: text("motivo"),
    data_envio: timestamp("data_envio", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    data_decisao: timestamp("data_decisao", {
      withTimezone: true,
      mode: "string",
    }),
    decided_by: uuid("decided_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("applications_status_data_envio_idx").on(t.status, t.data_envio),
    index("applications_school_year_id_idx").on(t.school_year_id),
    uniqueIndex("applications_account_year_idx")
      .on(t.applicant_account_id, t.school_year_id)
      .where(sql`${t.applicant_account_id} is not null`),
  ]
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    cpf: text("cpf"),
    serie: text("serie").notNull(),
    mensalidade: numeric("mensalidade", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
  },
  (t) => [index("students_application_id_idx").on(t.application_id)]
);

export const otherChildren = pgTable(
  "other_children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    cpf: text("cpf"),
    nascimento: date("nascimento", { mode: "string" }).notNull(),
  },
  (t) => [index("other_children_application_id_idx").on(t.application_id)]
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    ano: text("ano").notNull(),
  },
  (t) => [index("vehicles_application_id_idx").on(t.application_id)]
);

export const collaboration = pgTable(
  "collaboration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .unique()
      .references(() => applications.id, { onDelete: "cascade" }),
    limpeza: boolean("limpeza").notNull().default(false),
    limpeza_vezes_semana: integer("limpeza_vezes_semana"),
    mutirao: boolean("mutirao").notNull().default(false),
    mutirao_sabados: integer("mutirao_sabados"),
    arrecadacao: boolean("arrecadacao").notNull().default(false),
    buscar_benfeitores: boolean("buscar_benfeitores").notNull().default(false),
    outros: text("outros"),
  },
  (t) => [index("collaboration_application_id_idx").on(t.application_id)]
);

export const benefactors = pgTable(
  "benefactors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    email: text("email"),
  },
  (t) => [index("benefactors_application_id_idx").on(t.application_id)]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    categoria: text("categoria").notNull(),
    student_id: uuid("student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    storage_path: text("storage_path").notNull(),
    nome_arquivo: text("nome_arquivo").notNull(),
    mime_type: text("mime_type").notNull(),
    tamanho_bytes: integer("tamanho_bytes").notNull(),
    /** Pendência atendida por este arquivo, quando a família o reenviou pela conta. */
    document_request_id: uuid("document_request_id").references((): AnyPgColumn => documentRequests.id, {
      onDelete: "set null",
    }),
    uploaded_at: timestamp("uploaded_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("documents_application_id_idx").on(t.application_id),
    index("documents_student_id_idx").on(t.student_id),
  ]
);

export const decisionTemplates = pgTable(
  "decision_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: text("tipo").$type<"aprovacao" | "rejeicao">().notNull(),
    cabecalho: text("cabecalho").notNull(),
    corpo: text("corpo").notNull(),
    rodape: text("rodape").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Um modelo por tipo: `saveTemplate` faz upsert em cima desta unicidade.
    uniqueIndex("decision_templates_tipo_idx").on(t.tipo),
  ]
);

export const contractTemplates = pgTable(
  "contract_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: text("titulo")
      .notNull()
      .default("CONTRATO DE CONCESSÃO DE BOLSA DE ESTUDOS"),
    cabecalho: text("cabecalho").notNull().default(""),
    clausulas: jsonb("clausulas")
      .$type<ContractClause[]>()
      .notNull()
      .default([]),
    rodape: text("rodape").notNull().default(""),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [
    // A aplicação trata a tabela como registro único; o índice em (true)
    // garante o singleton no banco.
    uniqueIndex("contract_templates_singleton_idx").on(sql`(true)`),
  ]
);

export const documentHeader = pgTable(
  "document_header",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linha1: text("linha1")
      .notNull()
      .default("Arca Nossa Senhora da Providência"),
    linha2: text("linha2").notNull().default(""),
    linha3: text("linha3").notNull().default(""),
    mostrar_selo: boolean("mostrar_selo").notNull().default(true),
    rodape_institucional: text("rodape_institucional"),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [uniqueIndex("document_header_singleton_idx").on(sql`(true)`)]
);

export const donorWelcomeTemplates = pgTable(
  "donor_welcome_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assunto: text("assunto").notNull(),
    corpo: text("corpo").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [uniqueIndex("donor_welcome_templates_singleton_idx").on(sql`(true)`)]
);

export const donorPledges = pgTable(
  "donor_pledges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    cpf: text("cpf").notNull(),
    email: text("email").notNull(),
    frequencia: text("frequencia").$type<"unica" | "mensal">().notNull(),
    duracao: text("duracao").$type<"um_ano" | "indeterminado">(),
    dia_vencimento: integer("dia_vencimento"),
    valor: numeric("valor", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    meio_pagamento: text("meio_pagamento")
      .$type<"cartao" | "boleto" | "transferencia" | "pix">(),
    data_pagamento: date("data_pagamento", { mode: "string" }),
    lembrete_canal: text("lembrete_canal").$type<"whatsapp" | "email">(),
    telefone: text("telefone"),
    endereco: text("endereco"),
    cep: text("cep"),
    priorado_capela: text("priorado_capela"),
    residence_city: text("residence_city"),
    residence_state: text("residence_state"),
    residence_source: text("residence_source").$type<"confirmed" | "cep_lookup">(),
    recibo_path: text("recibo_path"),
    recibo_nome: text("recibo_nome"),
    observacoes: text("observacoes"),
    observacoes_financeiras: varchar("observacoes_financeiras", { length: 255 }),
    welcome_email_sent_at: timestamp("welcome_email_sent_at", {
      withTimezone: true,
      mode: "string",
    }),
    welcome_email_reservation_token: uuid("welcome_email_reservation_token"),
    welcome_email_reservation_expires_at: timestamp("welcome_email_reservation_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("donor_pledges_created_at_idx").on(t.created_at),
    check(
      "donor_pledges_residence_state_check",
      sql`${t.residence_state} is null or ${t.residence_state} in ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')`
    ),
    check(
      "donor_pledges_residence_source_check",
      sql`${t.residence_source} is null or ${t.residence_source} in ('confirmed', 'cep_lookup')`
    ),
    check(
      "donor_pledges_dia_vencimento_check",
      sql`(${t.frequencia} = 'mensal' and ${t.dia_vencimento} is not null and ${t.dia_vencimento} between 1 and 31) or (${t.frequencia} = 'unica' and ${t.dia_vencimento} is null)`
    ),
  ]
);

/** Primeiro mês coberto pelo razão mensal; meses anteriores não viram dívida inferida. */
export const donorLedgerSettings = pgTable(
  "donor_ledger_settings",
  {
    id: integer("id").primaryKey().default(1),
    launch_competencia: text("launch_competencia").notNull(),
  },
  (t) => [
    check("donor_ledger_settings_singleton_check", sql`${t.id} = 1`),
    check("donor_ledger_settings_competencia_check", sql`${t.launch_competencia} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
  ]
);

/** Valor esperado e comprovante são snapshots; conferência bancária virá na fase 3. */
export const donorPaymentLedger = pgTable(
  "donor_payment_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pledge_id: uuid("pledge_id")
      .notNull()
      .references(() => donorPledges.id, { onDelete: "cascade" }),
    competencia: text("competencia").notNull(),
    due_date: date("due_date", { mode: "string" }).notNull(),
    expected_value: numeric("expected_value", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    received_value: numeric("received_value", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    credit_date: date("credit_date", { mode: "string" }),
    status: text("status").notNull().default("pendente"),
    confirmed_by: uuid("confirmed_by").references(() => adminUsers.id),
    confirmed_at: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
    note: text("note"),
    receipt_link_generated_by: uuid("receipt_link_generated_by").references(() => adminUsers.id),
    receipt_link_generated_actor: text("receipt_link_generated_actor"),
    receipt_link_generated_at: timestamp("receipt_link_generated_at", { withTimezone: true, mode: "string" }),
    receipt_path: text("receipt_path"),
    receipt_name: text("receipt_name"),
    receipt_uploaded_at: timestamp("receipt_uploaded_at", {
      withTimezone: true,
      mode: "string",
    }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("donor_payment_ledger_pledge_competencia_idx").on(t.pledge_id, t.competencia),
    index("donor_payment_ledger_competencia_idx").on(t.competencia),
    check("donor_payment_ledger_competencia_check", sql`${t.competencia} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    check("donor_payment_ledger_due_month_check", sql`to_char(${t.due_date}, 'YYYY-MM') = ${t.competencia}`),
    check("donor_payment_ledger_due_day_check", sql`extract(day from ${t.due_date}) between 1 and 31`),
    check("donor_payment_ledger_expected_value_check", sql`${t.expected_value} > 0`),
    check("donor_payment_ledger_received_value_check", sql`${t.received_value} >= 0`),
    check("donor_payment_ledger_bank_state_check", sql`(${t.status} = 'pendente' and ${t.received_value} = 0 and ${t.credit_date} is null and ${t.confirmed_by} is null and ${t.confirmed_at} is null) or (${t.status} = 'nao_identificado' and ${t.received_value} = 0 and ${t.credit_date} is null and ${t.confirmed_by} is not null and ${t.confirmed_at} is not null) or (${t.status} in ('confirmado', 'divergente') and ${t.received_value} > 0 and ${t.credit_date} is not null and ${t.confirmed_by} is not null and ${t.confirmed_at} is not null)`),
    check("donor_payment_ledger_receipt_check", sql`(${t.receipt_path} is null and ${t.receipt_name} is null and ${t.receipt_uploaded_at} is null) or (${t.receipt_path} is not null and ${t.receipt_name} is not null and ${t.receipt_uploaded_at} is not null)`),
  ]
);

export const donorReminderTemplates = pgTable(
  "donor_reminder_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assunto: text("assunto").notNull(),
    corpo: text("corpo").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [uniqueIndex("donor_reminder_templates_singleton_idx").on(sql`(true)`)]
);

/** Modelo independente das boas-vindas e dos lembretes automáticos. */
export const donorMonthlyInstructionTemplates = pgTable(
  "donor_monthly_instruction_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assunto: text("assunto").notNull(),
    corpo: text("corpo").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [uniqueIndex("donor_monthly_instruction_templates_singleton_idx").on(sql`(true)`)]
);

/** Cada geração é uma tentativa auditável; o envio será implementado na task 21. */
export const donorMonthlyInstructionSends = pgTable(
  "donor_monthly_instruction_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pledge_id: uuid("pledge_id")
      .notNull()
      .references(() => donorPledges.id, { onDelete: "cascade" }),
    generation: integer("generation").notNull(),
    receipt_competencia: text("receipt_competencia"),
    status: text("status")
      .$type<"pending" | "sending" | "sent" | "failed" | "uncertain">()
      .notNull()
      .default("pending"),
    sent_at: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    error_code: text("error_code").$type<
      | "provider_rejected"
      | "provider_timeout"
      | "provider_unavailable"
      | "configuration"
      | "database"
      | "invalid_recipient"
      | "unknown"
    >(),
    attempt_count: integer("attempt_count").notNull().default(0),
    reservation_token: uuid("reservation_token"),
    reservation_expires_at: timestamp("reservation_expires_at", {
      withTimezone: true, mode: "string",
    }),
    provider_call_started_at: timestamp("provider_call_started_at", {
      withTimezone: true, mode: "string",
    }),
    provider_message_id: text("provider_message_id"),
    provider_idempotency_key: text("provider_idempotency_key").notNull(),
    frozen_recipient: text("frozen_recipient"),
    frozen_sender: text("frozen_sender"),
    frozen_subject: text("frozen_subject"),
    frozen_text: text("frozen_text"),
    frozen_html: text("frozen_html"),
    frozen_include_seal: boolean("frozen_include_seal"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("donor_monthly_instruction_sends_pledge_generation_idx").on(t.pledge_id, t.generation),
    uniqueIndex("donor_monthly_instruction_sends_provider_key_idx").on(t.provider_idempotency_key),
    index("donor_monthly_instruction_sends_status_lease_idx").on(t.status, t.reservation_expires_at),
    check("donor_monthly_instruction_sends_generation_check", sql`${t.generation} > 0`),
    check("donor_monthly_instruction_sends_competencia_check", sql`${t.receipt_competencia} is null or ${t.receipt_competencia} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    check("donor_monthly_instruction_sends_status_check", sql`${t.status} in ('pending', 'sending', 'sent', 'failed', 'uncertain')`),
    check("donor_monthly_instruction_sends_attempt_count_check", sql`${t.attempt_count} >= 0`),
    check("donor_monthly_instruction_sends_error_code_check", sql`${t.error_code} is null or ${t.error_code} in ('provider_rejected', 'provider_timeout', 'provider_unavailable', 'configuration', 'database', 'invalid_recipient', 'unknown')`),
    check("donor_monthly_instruction_sends_sent_at_check", sql`(${t.status} = 'sent' and ${t.sent_at} is not null) or (${t.status} <> 'sent' and ${t.sent_at} is null)`),
    check("donor_monthly_instruction_sends_reservation_check", sql`(${t.reservation_token} is null and ${t.reservation_expires_at} is null) or (${t.reservation_token} is not null and ${t.reservation_expires_at} is not null)`),
    check("donor_monthly_instruction_sends_provider_key_check", sql`length(${t.provider_idempotency_key}) between 1 and 256`),
    check("donor_monthly_instruction_sends_frozen_payload_check", sql`(${t.frozen_recipient} is null and ${t.frozen_sender} is null and ${t.frozen_subject} is null and ${t.frozen_text} is null and ${t.frozen_html} is null and ${t.frozen_include_seal} is null) or (${t.frozen_recipient} is not null and ${t.frozen_sender} is not null and ${t.frozen_subject} is not null and ${t.frozen_text} is not null and ${t.frozen_html} is not null and ${t.frozen_include_seal} is not null)`),
  ]
);

export const donorReminderSends = pgTable(
  "donor_reminder_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pledge_id: uuid("pledge_id")
      .notNull()
      .references(() => donorPledges.id, { onDelete: "cascade" }),
    competencia: text("competencia").notNull(),
    kind: text("kind").$type<"10d" | "5d">().notNull(),
    due_date: date("due_date", { mode: "string" }).notNull(),
    status: text("status")
      .$type<"sending" | "sent" | "failed" | "uncertain">()
      .notNull(),
    sent_at: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    error_code: text("error_code").$type<
      | "provider_rejected"
      | "provider_timeout"
      | "provider_unavailable"
      | "configuration"
      | "database"
      | "invalid_recipient"
      | "unknown"
    >(),
    attempt_count: integer("attempt_count").notNull().default(0),
    reservation_token: uuid("reservation_token"),
    reservation_expires_at: timestamp("reservation_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    provider_call_started_at: timestamp("provider_call_started_at", {
      withTimezone: true,
      mode: "string",
    }),
    provider_message_id: text("provider_message_id"),
    provider_idempotency_key: text("provider_idempotency_key").notNull(),
    frozen_recipient: text("frozen_recipient"),
    frozen_sender: text("frozen_sender"),
    frozen_subject: text("frozen_subject"),
    frozen_text: text("frozen_text"),
    frozen_html: text("frozen_html"),
    frozen_include_seal: boolean("frozen_include_seal"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("donor_reminder_sends_pledge_competencia_kind_idx").on(
      t.pledge_id,
      t.competencia,
      t.kind
    ),
    uniqueIndex("donor_reminder_sends_provider_key_idx").on(t.provider_idempotency_key),
    index("donor_reminder_sends_status_lease_idx").on(t.status, t.reservation_expires_at),
    check("donor_reminder_sends_competencia_check", sql`${t.competencia} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    check("donor_reminder_sends_kind_check", sql`${t.kind} in ('10d', '5d')`),
    check("donor_reminder_sends_status_check", sql`${t.status} in ('sending', 'sent', 'failed', 'uncertain')`),
    check("donor_reminder_sends_attempt_count_check", sql`${t.attempt_count} >= 0`),
    check("donor_reminder_sends_error_code_check", sql`${t.error_code} is null or ${t.error_code} in ('provider_rejected', 'provider_timeout', 'provider_unavailable', 'configuration', 'database', 'invalid_recipient', 'unknown')`),
    check("donor_reminder_sends_sent_at_check", sql`${t.status} <> 'sent' or ${t.sent_at} is not null`),
    check("donor_reminder_sends_frozen_payload_check", sql`(${t.frozen_recipient} is null and ${t.frozen_sender} is null and ${t.frozen_subject} is null and ${t.frozen_text} is null and ${t.frozen_html} is null and ${t.frozen_include_seal} is null) or (${t.frozen_recipient} is not null and ${t.frozen_sender} is not null and ${t.frozen_subject} is not null and ${t.frozen_text} is not null and ${t.frozen_html} is not null and ${t.frozen_include_seal} is not null)`),
  ]
);

/** Histórico operacional interno, apenas de inclusão. */
export const applicationObservations = pgTable(
  "application_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    author_user_id: uuid("author_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("application_observations_application_created_at_idx").on(
      t.application_id,
      t.created_at
    ),
    index("application_observations_author_user_id_idx").on(t.author_user_id),
  ]
);

export type DocumentRequestStatus = "aberta" | "reenviada" | "resolvida" | "cancelada";

/**
 * Documento que a equipe pediu à família depois do envio (ilegível,
 * divergente, faltando). A família reenvia pela conta; o arquivo novo entra
 * em `documents` com `document_request_id`.
 */
export const documentRequests = pgTable(
  "document_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** Categoria de `documents` (ex.: rg_pai, rg_aluno) ou `outro`. */
    categoria: text("categoria").notNull(),
    student_id: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
    motivo: text("motivo").notNull(),
    status: text("status").$type<DocumentRequestStatus>().notNull().default("aberta"),
    created_by: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    /** Último aviso por e-mail enviado com esta pendência aberta; nulo se o envio falhou. */
    notified_at: timestamp("notified_at", { withTimezone: true, mode: "string" }),
    resubmitted_at: timestamp("resubmitted_at", { withTimezone: true, mode: "string" }),
    resolved_at: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    resolved_by: uuid("resolved_by").references(() => adminUsers.id, { onDelete: "set null" }),
  },
  (t) => [
    index("document_requests_application_idx").on(t.application_id, t.created_at),
    check("document_requests_status_check", sql`${t.status} in ('aberta', 'reenviada', 'resolvida', 'cancelada')`),
    check("document_requests_motivo_check", sql`char_length(${t.motivo}) between 1 and 500`),
  ]
);

/** Versões imutáveis dos documentos finais emitidos por Administradores. */
export const issuedDocuments = pgTable(
  "issued_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    application_id: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"decision" | "contract">().notNull(),
    version: integer("version").notNull(),
    storage_path: text("storage_path").notNull(),
    filename: text("filename").notNull(),
    mime_type: text("mime_type").notNull().default("application/pdf"),
    size_bytes: integer("size_bytes").notNull(),
    issued_by: uuid("issued_by")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    issued_at: timestamp("issued_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("issued_documents_kind_check", sql`${t.kind} in ('decision', 'contract')`),
    check("issued_documents_mime_type_check", sql`${t.mime_type} = 'application/pdf'`),
    check("issued_documents_version_positive", sql`${t.version} > 0`),
    check("issued_documents_size_bytes_positive", sql`${t.size_bytes} > 0`),
    uniqueIndex("issued_documents_application_kind_version_unique").on(
      t.application_id,
      t.kind,
      t.version
    ),
    index("issued_documents_application_kind_version_idx").on(
      t.application_id,
      t.kind,
      desc(t.version)
    ),
    index("issued_documents_issued_by_idx").on(t.issued_by),
  ]
);

// As relações mantêm os nomes das chaves usadas pelas actions e pelos PDFs
// (`students`, `school_years`, …), por isso não são pluralizadas em camelCase.

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  students: many(students),
  other_children: many(otherChildren),
  vehicles: many(vehicles),
  benefactors: many(benefactors),
  documents: many(documents),
  application_observations: many(applicationObservations),
  issued_documents: many(issuedDocuments),
  document_requests: many(documentRequests),
  collaboration: one(collaboration, {
    fields: [applications.id],
    references: [collaboration.application_id],
  }),
  school_years: one(schoolYears, {
    fields: [applications.school_year_id],
    references: [schoolYears.id],
  }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  application_observations: many(applicationObservations),
  issued_documents: many(issuedDocuments),
}));

export const applicationObservationsRelations = relations(
  applicationObservations,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationObservations.application_id],
      references: [applications.id],
    }),
    author_user: one(adminUsers, {
      fields: [applicationObservations.author_user_id],
      references: [adminUsers.id],
    }),
  })
);

export const issuedDocumentsRelations = relations(issuedDocuments, ({ one }) => ({
  application: one(applications, {
    fields: [issuedDocuments.application_id],
    references: [applications.id],
  }),
  issued_by_user: one(adminUsers, {
    fields: [issuedDocuments.issued_by],
    references: [adminUsers.id],
  }),
}));

export const schoolYearsRelations = relations(schoolYears, ({ many }) => ({
  applications: many(applications),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  application: one(applications, {
    fields: [students.application_id],
    references: [applications.id],
  }),
  documents: many(documents),
}));

export const otherChildrenRelations = relations(otherChildren, ({ one }) => ({
  application: one(applications, {
    fields: [otherChildren.application_id],
    references: [applications.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  application: one(applications, {
    fields: [vehicles.application_id],
    references: [applications.id],
  }),
}));

export const collaborationRelations = relations(collaboration, ({ one }) => ({
  application: one(applications, {
    fields: [collaboration.application_id],
    references: [applications.id],
  }),
}));

export const benefactorsRelations = relations(benefactors, ({ one }) => ({
  application: one(applications, {
    fields: [benefactors.application_id],
    references: [applications.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  application: one(applications, {
    fields: [documents.application_id],
    references: [applications.id],
  }),
  student: one(students, {
    fields: [documents.student_id],
    references: [students.id],
  }),
  document_request: one(documentRequests, {
    fields: [documents.document_request_id],
    references: [documentRequests.id],
  }),
}));

export const documentRequestsRelations = relations(documentRequests, ({ one, many }) => ({
  application: one(applications, {
    fields: [documentRequests.application_id],
    references: [applications.id],
  }),
  student: one(students, {
    fields: [documentRequests.student_id],
    references: [students.id],
  }),
  documents: many(documents),
}));
