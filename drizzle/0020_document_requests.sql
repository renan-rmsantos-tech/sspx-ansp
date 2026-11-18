CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"student_id" uuid,
	"motivo" text NOT NULL,
	"status" text DEFAULT 'aberta' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	"resubmitted_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	CONSTRAINT "document_requests_status_check" CHECK ("document_requests"."status" in ('aberta', 'reenviada', 'resolvida', 'cancelada')),
	CONSTRAINT "document_requests_motivo_check" CHECK (char_length("document_requests"."motivo") between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "document_request_id" uuid;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_requests_application_idx" ON "document_requests" USING btree ("application_id","created_at");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_request_id_document_requests_id_fk" FOREIGN KEY ("document_request_id") REFERENCES "public"."document_requests"("id") ON DELETE set null ON UPDATE no action;