import { db } from "@/lib/db";
import { donorMonthlyInstructionTemplates } from "@/lib/db/schema";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
  type DonorMonthlyInstructionsTemplate,
  validateDonorMonthlyInstructionsTemplate,
} from "./donor-monthly-instructions-template";

export async function ensureDonorMonthlyInstructionsTemplate(database: typeof db = db) {
  const initial = validateDonorMonthlyInstructionsTemplate({
    assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
    corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY,
  });
  await database.insert(donorMonthlyInstructionTemplates).values(initial).onConflictDoNothing();
}

export async function getDonorMonthlyInstructionsTemplate(database: typeof db = db) {
  const saved = await database.query.donorMonthlyInstructionTemplates.findFirst();
  return saved ?? {
    assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
    corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY,
  };
}

// Internal persistence function; admin actions must authorize callers before using it.
export async function saveDonorMonthlyInstructionsTemplate(
  input: DonorMonthlyInstructionsTemplate,
  database: typeof db = db
) {
  const template = validateDonorMonthlyInstructionsTemplate(input);
  await ensureDonorMonthlyInstructionsTemplate(database);
  await database.update(donorMonthlyInstructionTemplates).set({
    ...template,
    updated_at: new Date().toISOString(),
  });
  return template;
}
