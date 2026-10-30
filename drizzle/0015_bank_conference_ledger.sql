ALTER TABLE "donor_payment_ledger" ADD COLUMN "received_value" numeric(12, 2) DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD COLUMN "credit_date" date;
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD COLUMN "status" text DEFAULT 'pendente' NOT NULL;
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD COLUMN "confirmed_by" uuid REFERENCES "admin_users"("id");
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD COLUMN "confirmed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD COLUMN "note" text;
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD CONSTRAINT "donor_payment_ledger_received_value_check" CHECK ("received_value" >= 0);
--> statement-breakpoint
ALTER TABLE "donor_payment_ledger" ADD CONSTRAINT "donor_payment_ledger_bank_state_check" CHECK (("status" = 'pendente' AND "received_value" = 0 AND "credit_date" IS NULL AND "confirmed_by" IS NULL AND "confirmed_at" IS NULL) OR ("status" = 'nao_identificado' AND "received_value" = 0 AND "credit_date" IS NULL AND "confirmed_by" IS NOT NULL AND "confirmed_at" IS NOT NULL) OR ("status" IN ('confirmado', 'divergente') AND "received_value" > 0 AND "credit_date" IS NOT NULL AND "confirmed_by" IS NOT NULL AND "confirmed_at" IS NOT NULL));
--> statement-breakpoint
INSERT INTO "donor_payment_ledger" ("pledge_id", "competencia", "due_date", "expected_value", "receipt_path", "receipt_name", "receipt_uploaded_at")
SELECT p.id, to_char(COALESCE(p.data_pagamento, (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date), 'YYYY-MM'),
  COALESCE(p.data_pagamento, (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date), p.valor,
  p.recibo_path, p.recibo_nome,
  CASE WHEN p.recibo_path IS NOT NULL THEN p.created_at ELSE NULL END
FROM "donor_pledges" p WHERE p.frequencia = 'unica' AND p.valor > 0
ON CONFLICT ("pledge_id", "competencia") DO NOTHING;
