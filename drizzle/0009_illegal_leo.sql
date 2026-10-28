ALTER TABLE "donor_pledges" ADD COLUMN "dia_vencimento" integer;--> statement-breakpoint
UPDATE "donor_pledges"
SET "dia_vencimento" = LEAST(EXTRACT(DAY FROM "created_at" AT TIME ZONE 'America/Sao_Paulo')::int, 28)
WHERE "frequencia" = 'mensal';--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_dia_vencimento_check" CHECK (("donor_pledges"."frequencia" = 'mensal' and "donor_pledges"."dia_vencimento" is not null and "donor_pledges"."dia_vencimento" between 1 and 28) or ("donor_pledges"."frequencia" = 'unica' and "donor_pledges"."dia_vencimento" is null));
