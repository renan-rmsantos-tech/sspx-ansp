CREATE TABLE "applicant_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicant_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_tokens_kind_check" CHECK ("applicant_tokens"."kind" in ('verify_email', 'reset_password'))
);
--> statement-breakpoint
CREATE TABLE "application_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"school_year_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "applicant_account_id" uuid;--> statement-breakpoint
ALTER TABLE "applicant_tokens" ADD CONSTRAINT "applicant_tokens_account_id_applicant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."applicant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_account_id_applicant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."applicant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applicant_accounts_email_idx" ON "applicant_accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "applicant_tokens_hash_idx" ON "applicant_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "applicant_tokens_account_kind_idx" ON "applicant_tokens" USING btree ("account_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "application_drafts_account_year_idx" ON "application_drafts" USING btree ("account_id","school_year_id");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_account_id_applicant_accounts_id_fk" FOREIGN KEY ("applicant_account_id") REFERENCES "public"."applicant_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_account_year_idx" ON "applications" USING btree ("applicant_account_id","school_year_id") WHERE "applications"."applicant_account_id" is not null;