import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { donorReminderTemplates } from "@/lib/db/schema";
import {
  DONOR_REMINDER_BODY,
  DONOR_REMINDER_SUBJECT,
  normalizeLegacyDonorReminderTemplate,
  type DonorReminderTemplate,
  validateDonorReminderTemplate,
} from "./donor-reminder-template";

export async function ensureDonorReminderTemplate(database: typeof db = db) {
  const initial = validateDonorReminderTemplate({
    assunto: DONOR_REMINDER_SUBJECT,
    corpo: DONOR_REMINDER_BODY,
  });
  await database.insert(donorReminderTemplates).values(initial).onConflictDoNothing();
  await getDonorReminderTemplate(database);
}

export async function getDonorReminderTemplate(database: typeof db = db) {
  const saved = await database.query.donorReminderTemplates.findFirst();
  if (!saved) return { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };
  const normalized = normalizeLegacyDonorReminderTemplate(saved);
  if (normalized.corpo !== saved.corpo) {
    await database.update(donorReminderTemplates).set({
      corpo: normalized.corpo, updated_at: new Date().toISOString(),
    }).where(eq(donorReminderTemplates.id, saved.id));
  }
  return normalized;
}

// Internal persistence function; admin actions must authorize callers before using it.
export async function saveDonorReminderTemplate(
  input: DonorReminderTemplate,
  database: typeof db = db
) {
  const template = validateDonorReminderTemplate(input);
  await ensureDonorReminderTemplate(database);
  await database.update(donorReminderTemplates).set({
    ...template,
    updated_at: new Date().toISOString(),
  });
  return template;
}
