ALTER TABLE "donor_payment_ledger" ADD COLUMN "receipt_link_generated_by" uuid REFERENCES "admin_users"("id");
ALTER TABLE "donor_payment_ledger" ADD COLUMN "receipt_link_generated_at" timestamptz;
