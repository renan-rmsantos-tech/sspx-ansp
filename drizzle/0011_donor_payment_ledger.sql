CREATE TABLE "donor_ledger_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"launch_competencia" text NOT NULL,
	CONSTRAINT "donor_ledger_settings_singleton_check" CHECK ("donor_ledger_settings"."id" = 1),
	CONSTRAINT "donor_ledger_settings_competencia_check" CHECK ("donor_ledger_settings"."launch_competencia" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
CREATE TABLE "donor_payment_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pledge_id" uuid NOT NULL,
	"competencia" text NOT NULL,
	"due_date" date NOT NULL,
	"expected_value" numeric(12, 2) NOT NULL,
	"receipt_path" text,
	"receipt_name" text,
	"receipt_uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donor_payment_ledger_competencia_check" CHECK ("donor_payment_ledger"."competencia" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "donor_payment_ledger_due_month_check" CHECK (to_char("donor_payment_ledger"."due_date", 'YYYY-MM') = "donor_payment_ledger"."competencia"),
	CONSTRAINT "donor_payment_ledger_due_day_check" CHECK (extract(day from "donor_payment_ledger"."due_date") between 1 and 28),
	CONSTRAINT "donor_payment_ledger_expected_value_check" CHECK ("donor_payment_ledger"."expected_value" > 0),
	CONSTRAINT "donor_payment_ledger_receipt_check" CHECK (("donor_payment_ledger"."receipt_path" is null and "donor_payment_ledger"."receipt_name" is null and "donor_payment_ledger"."receipt_uploaded_at" is null) or ("donor_payment_ledger"."receipt_path" is not null and "donor_payment_ledger"."receipt_name" is not null and "donor_payment_ledger"."receipt_uploaded_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD CONSTRAINT "donor_payment_ledger_pledge_id_donor_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."donor_pledges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_payment_ledger_pledge_competencia_idx" ON "donor_payment_ledger" USING btree ("pledge_id","competencia");--> statement-breakpoint
CREATE INDEX "donor_payment_ledger_competencia_idx" ON "donor_payment_ledger" USING btree ("competencia");
--> statement-breakpoint
INSERT INTO "donor_ledger_settings" ("id", "launch_competencia")
VALUES (1, to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM'));
--> statement-breakpoint
WITH eligible AS (
  SELECT p.id, p.dia_vencimento, p.valor, p.duracao, s.launch_competencia,
    to_date(s.launch_competencia || '-01', 'YYYY-MM-DD') AS launch_month,
    CASE
      WHEN extract(day FROM p.created_at AT TIME ZONE 'America/Sao_Paulo') <= p.dia_vencimento
        THEN date_trunc('month', p.created_at AT TIME ZONE 'America/Sao_Paulo')::date
      ELSE (date_trunc('month', p.created_at AT TIME ZONE 'America/Sao_Paulo') + interval '1 month')::date
    END AS first_due_month
  FROM "donor_pledges" p CROSS JOIN "donor_ledger_settings" s
  WHERE p.frequencia = 'mensal'
    AND p.duracao IN ('um_ano', 'indeterminado')
    AND p.dia_vencimento BETWEEN 1 AND 28
    AND p.valor > 0
)
INSERT INTO "donor_payment_ledger" ("pledge_id", "competencia", "due_date", "expected_value")
SELECT e.id, e.launch_competencia,
  (e.launch_month + (e.dia_vencimento - 1))::date, e.valor
FROM eligible e
WHERE e.launch_month >= e.first_due_month
  AND (e.duracao = 'indeterminado' OR e.launch_month < e.first_due_month + interval '12 months')
ON CONFLICT (pledge_id, competencia) DO NOTHING;
