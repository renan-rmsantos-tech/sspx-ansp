ALTER TABLE "donor_pledges" ALTER COLUMN "meio_pagamento" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "recibo_path" text;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "recibo_nome" text;