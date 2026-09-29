CREATE TABLE "donor_welcome_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assunto" text NOT NULL,
	"corpo" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donor_pledges" ADD COLUMN "welcome_email_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_welcome_templates_singleton_idx" ON "donor_welcome_templates" USING btree ((true));
