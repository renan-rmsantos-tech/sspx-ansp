CREATE TABLE "donor_monthly_instruction_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pledge_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"receipt_competencia" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"error_code" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"reservation_token" uuid,
	"reservation_expires_at" timestamp with time zone,
	"provider_call_started_at" timestamp with time zone,
	"provider_message_id" text,
	"provider_idempotency_key" text NOT NULL,
	"frozen_recipient" text,
	"frozen_sender" text,
	"frozen_subject" text,
	"frozen_text" text,
	"frozen_html" text,
	"frozen_include_seal" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donor_monthly_instruction_sends_generation_check" CHECK ("donor_monthly_instruction_sends"."generation" > 0),
	CONSTRAINT "donor_monthly_instruction_sends_competencia_check" CHECK ("donor_monthly_instruction_sends"."receipt_competencia" is null or "donor_monthly_instruction_sends"."receipt_competencia" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "donor_monthly_instruction_sends_status_check" CHECK ("donor_monthly_instruction_sends"."status" in ('pending', 'sending', 'sent', 'failed', 'uncertain')),
	CONSTRAINT "donor_monthly_instruction_sends_attempt_count_check" CHECK ("donor_monthly_instruction_sends"."attempt_count" >= 0),
	CONSTRAINT "donor_monthly_instruction_sends_error_code_check" CHECK ("donor_monthly_instruction_sends"."error_code" is null or "donor_monthly_instruction_sends"."error_code" in ('provider_rejected', 'provider_timeout', 'provider_unavailable', 'configuration', 'database', 'invalid_recipient', 'unknown')),
	CONSTRAINT "donor_monthly_instruction_sends_sent_at_check" CHECK (("donor_monthly_instruction_sends"."status" = 'sent' and "donor_monthly_instruction_sends"."sent_at" is not null) or ("donor_monthly_instruction_sends"."status" <> 'sent' and "donor_monthly_instruction_sends"."sent_at" is null)),
	CONSTRAINT "donor_monthly_instruction_sends_reservation_check" CHECK (("donor_monthly_instruction_sends"."reservation_token" is null and "donor_monthly_instruction_sends"."reservation_expires_at" is null) or ("donor_monthly_instruction_sends"."reservation_token" is not null and "donor_monthly_instruction_sends"."reservation_expires_at" is not null)),
	CONSTRAINT "donor_monthly_instruction_sends_provider_key_check" CHECK (length("donor_monthly_instruction_sends"."provider_idempotency_key") between 1 and 256),
	CONSTRAINT "donor_monthly_instruction_sends_frozen_payload_check" CHECK (("donor_monthly_instruction_sends"."frozen_recipient" is null and "donor_monthly_instruction_sends"."frozen_sender" is null and "donor_monthly_instruction_sends"."frozen_subject" is null and "donor_monthly_instruction_sends"."frozen_text" is null and "donor_monthly_instruction_sends"."frozen_html" is null and "donor_monthly_instruction_sends"."frozen_include_seal" is null) or ("donor_monthly_instruction_sends"."frozen_recipient" is not null and "donor_monthly_instruction_sends"."frozen_sender" is not null and "donor_monthly_instruction_sends"."frozen_subject" is not null and "donor_monthly_instruction_sends"."frozen_text" is not null and "donor_monthly_instruction_sends"."frozen_html" is not null and "donor_monthly_instruction_sends"."frozen_include_seal" is not null))
);
--> statement-breakpoint
CREATE TABLE "donor_monthly_instruction_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assunto" text NOT NULL,
	"corpo" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donor_monthly_instruction_sends" ADD CONSTRAINT "donor_monthly_instruction_sends_pledge_id_donor_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."donor_pledges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_monthly_instruction_sends_pledge_generation_idx" ON "donor_monthly_instruction_sends" USING btree ("pledge_id","generation");--> statement-breakpoint
CREATE UNIQUE INDEX "donor_monthly_instruction_sends_provider_key_idx" ON "donor_monthly_instruction_sends" USING btree ("provider_idempotency_key");--> statement-breakpoint
CREATE INDEX "donor_monthly_instruction_sends_status_lease_idx" ON "donor_monthly_instruction_sends" USING btree ("status","reservation_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "donor_monthly_instruction_templates_singleton_idx" ON "donor_monthly_instruction_templates" USING btree ((true));--> statement-breakpoint
CREATE FUNCTION prevent_donor_monthly_instruction_payload_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.pledge_id IS DISTINCT FROM NEW.pledge_id
    OR OLD.generation IS DISTINCT FROM NEW.generation
    OR OLD.provider_idempotency_key IS DISTINCT FROM NEW.provider_idempotency_key
    OR (OLD.receipt_competencia IS NOT NULL AND OLD.receipt_competencia IS DISTINCT FROM NEW.receipt_competencia)
    OR (OLD.frozen_recipient IS NOT NULL AND OLD.receipt_competencia IS DISTINCT FROM NEW.receipt_competencia)
    OR (OLD.frozen_recipient IS NOT NULL AND
      ROW(OLD.frozen_recipient, OLD.frozen_sender, OLD.frozen_subject, OLD.frozen_text, OLD.frozen_html, OLD.frozen_include_seal)
      IS DISTINCT FROM
      ROW(NEW.frozen_recipient, NEW.frozen_sender, NEW.frozen_subject, NEW.frozen_text, NEW.frozen_html, NEW.frozen_include_seal))
  THEN
    RAISE EXCEPTION 'Monthly instructions send payload cannot change after reservation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER donor_monthly_instruction_sends_frozen_payload_trigger
BEFORE UPDATE ON "donor_monthly_instruction_sends"
FOR EACH ROW EXECUTE FUNCTION prevent_donor_monthly_instruction_payload_change();
