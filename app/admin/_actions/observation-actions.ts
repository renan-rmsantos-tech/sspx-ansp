"use server";

import { asc, eq } from "drizzle-orm";
import { requireCapability } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { applicationObservations } from "@/lib/db/schema";

export async function getApplicationObservations(applicationId: string) {
  await requireCapability("observations:read");
  return db.query.applicationObservations.findMany({
    columns: { id: true, body: true, created_at: true },
    with: { author_user: { columns: { id: true, email: true } } },
    where: eq(applicationObservations.application_id, applicationId),
    orderBy: asc(applicationObservations.created_at),
  });
}

export async function addApplicationObservation(applicationId: string, body: string) {
  const staff = await requireCapability("observations:create");
  if (staff.role !== "secretaria") {
    return { success: false, error: "Somente a Secretaria pode registrar observações." };
  }
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { success: false, error: "A observação deve ter entre 1 e 2.000 caracteres." };
  }
  try {
    const [observation] = await db.insert(applicationObservations).values({
      application_id: applicationId,
      author_user_id: staff.id,
      body: trimmed,
    }).returning({ id: applicationObservations.id, body: applicationObservations.body, created_at: applicationObservations.created_at });
    return { success: true, data: observation };
  } catch {
    return { success: false, error: "Não foi possível registrar a observação." };
  }
}
