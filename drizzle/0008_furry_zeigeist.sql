ALTER TABLE "donor_pledges" ADD COLUMN "residence_city" text;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "residence_state" text;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "residence_source" text;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "welcome_email_reservation_token" uuid;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "welcome_email_reservation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_residence_state_check" CHECK ("donor_pledges"."residence_state" is null or "donor_pledges"."residence_state" in ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'));--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_residence_source_check" CHECK ("donor_pledges"."residence_source" is null or "donor_pledges"."residence_source" in ('confirmed', 'cep_lookup'));