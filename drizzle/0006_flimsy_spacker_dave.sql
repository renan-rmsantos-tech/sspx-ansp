CREATE TABLE "application_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issued_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"size_bytes" integer NOT NULL,
	"issued_by" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issued_documents_kind_check" CHECK ("issued_documents"."kind" in ('decision', 'contract')),
	CONSTRAINT "issued_documents_mime_type_check" CHECK ("issued_documents"."mime_type" = 'application/pdf'),
	CONSTRAINT "issued_documents_version_positive" CHECK ("issued_documents"."version" > 0),
	CONSTRAINT "issued_documents_size_bytes_positive" CHECK ("issued_documents"."size_bytes" > 0)
);
--> statement-breakpoint
-- Preserve legacy identities and decisions: backfill before enforcing role.
ALTER TABLE "admin_users" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "ativo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "admin_users" SET "role" = 'admin' WHERE "role" IS NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_check" CHECK ("admin_users"."role" in ('admin', 'secretaria'));--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "application_observations" ADD CONSTRAINT "application_observations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_observations" ADD CONSTRAINT "application_observations_author_user_id_admin_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_issued_by_admin_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_observations_application_created_at_idx" ON "application_observations" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "application_observations_author_user_id_idx" ON "application_observations" USING btree ("author_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issued_documents_application_kind_version_unique" ON "issued_documents" USING btree ("application_id","kind","version");--> statement-breakpoint
CREATE INDEX "issued_documents_application_kind_version_idx" ON "issued_documents" USING btree ("application_id","kind","version" desc);--> statement-breakpoint
CREATE INDEX "issued_documents_issued_by_idx" ON "issued_documents" USING btree ("issued_by");--> statement-breakpoint
