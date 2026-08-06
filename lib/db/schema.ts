import { relations, sql } from "drizzle-orm";
import {
  boolean,
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
} from "drizzle-orm/pg-core";
import type { ContractClause } from "@/lib/templates/contract-tokens";

// Os campos TypeScript usam o mesmo nome das colunas (snake_case) porque as
// server actions devolvem as linhas direto para os componentes e para os PDFs.

/** Contas do painel administrativo (substitui o Supabase Auth). */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

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

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    school_year_id: uuid("school_year_id")
      .notNull()
      .references(() => schoolYears.id),
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
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [uniqueIndex("document_header_singleton_idx").on(sql`(true)`)]
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
    recibo_path: text("recibo_path"),
    recibo_nome: text("recibo_nome"),
    observacoes: text("observacoes"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("donor_pledges_created_at_idx").on(t.created_at)]
);

// As relações mantêm os nomes das chaves usadas pelas actions e pelos PDFs
// (`students`, `school_years`, …), por isso não são pluralizadas em camelCase.

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  students: many(students),
  other_children: many(otherChildren),
  vehicles: many(vehicles),
  benefactors: many(benefactors),
  documents: many(documents),
  collaboration: one(collaboration, {
    fields: [applications.id],
    references: [collaboration.application_id],
  }),
  school_years: one(schoolYears, {
    fields: [applications.school_year_id],
    references: [schoolYears.id],
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
}));
