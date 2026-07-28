CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year_id" uuid NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"escola" text NOT NULL,
	"pai_nome" text NOT NULL,
	"pai_rg" text NOT NULL,
	"pai_cpf" text NOT NULL,
	"pai_profissao" text,
	"mae_nome" text NOT NULL,
	"mae_cpf" text NOT NULL,
	"mae_profissao" text,
	"endereco" text NOT NULL,
	"cep" text,
	"telefone" text NOT NULL,
	"email" text,
	"renda_pai" numeric(12, 2),
	"renda_mae" numeric(12, 2),
	"renda_outros" numeric(12, 2),
	"pessoas_domicilio" integer NOT NULL,
	"despesa_aluguel" numeric(12, 2),
	"despesa_servicos" numeric(12, 2),
	"despesa_tv" numeric(12, 2),
	"despesa_celular_plano" numeric(12, 2),
	"despesa_celular_parcelas" numeric(12, 2),
	"despesa_internet" numeric(12, 2),
	"desconto_solicitado" numeric(5, 2) NOT NULL,
	"desconto_concedido" numeric(5, 2),
	"motivo" text,
	"data_envio" timestamp with time zone DEFAULT now() NOT NULL,
	"data_decisao" timestamp with time zone,
	"decided_by" uuid
);
--> statement-breakpoint
CREATE TABLE "benefactors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text
);
--> statement-breakpoint
CREATE TABLE "collaboration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"limpeza" boolean DEFAULT false NOT NULL,
	"limpeza_vezes_semana" integer,
	"mutirao" boolean DEFAULT false NOT NULL,
	"mutirao_sabados" integer,
	"arrecadacao" boolean DEFAULT false NOT NULL,
	"buscar_benfeitores" boolean DEFAULT false NOT NULL,
	"outros" text,
	CONSTRAINT "collaboration_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text DEFAULT 'CONTRATO DE CONCESSÃO DE BOLSA DE ESTUDOS' NOT NULL,
	"cabecalho" text DEFAULT '' NOT NULL,
	"clausulas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rodape" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"cabecalho" text NOT NULL,
	"corpo" text NOT NULL,
	"rodape" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_header" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"linha1" text DEFAULT 'Arca Nossa Senhora da Providência' NOT NULL,
	"linha2" text DEFAULT '' NOT NULL,
	"linha3" text DEFAULT '' NOT NULL,
	"mostrar_selo" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"student_id" uuid,
	"storage_path" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donor_pledges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cpf" text NOT NULL,
	"email" text NOT NULL,
	"frequencia" text NOT NULL,
	"duracao" text,
	"valor" numeric(12, 2) NOT NULL,
	"meio_pagamento" text NOT NULL,
	"data_pagamento" date,
	"lembrete_canal" text,
	"telefone" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "other_children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cpf" text,
	"nascimento" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cpf" text,
	"serie" text NOT NULL,
	"mensalidade" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"ano" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_decided_by_admin_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefactors" ADD CONSTRAINT "benefactors_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration" ADD CONSTRAINT "collaboration_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "other_children" ADD CONSTRAINT "other_children_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_status_data_envio_idx" ON "applications" USING btree ("status","data_envio");--> statement-breakpoint
CREATE INDEX "applications_school_year_id_idx" ON "applications" USING btree ("school_year_id");--> statement-breakpoint
CREATE INDEX "benefactors_application_id_idx" ON "benefactors" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "collaboration_application_id_idx" ON "collaboration" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "documents_application_id_idx" ON "documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "documents_student_id_idx" ON "documents" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "donor_pledges_created_at_idx" ON "donor_pledges" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "other_children_application_id_idx" ON "other_children" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_years_only_one_active" ON "school_years" USING btree ("ativo") WHERE "school_years"."ativo" = true;--> statement-breakpoint
CREATE INDEX "students_application_id_idx" ON "students" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "vehicles_application_id_idx" ON "vehicles" USING btree ("application_id");