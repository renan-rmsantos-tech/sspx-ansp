"use server";

import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";

const INVALID = "Não foi possível concluir a operação.";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validPassword(password: string) {
  return password.length >= 8;
}

export async function listSecretariatUsers() {
  await requireAdmin();
  return db.query.adminUsers.findMany({
    columns: { id: true, email: true, ativo: true, created_at: true },
    where: eq(adminUsers.role, "secretaria"),
  });
}

export async function createSecretariatUser(email: string, password: string) {
  await requireAdmin();
  const normalized = normalizeEmail(email);
  if (!normalized || !validPassword(password)) return { success: false, error: INVALID };
  if (await db.query.adminUsers.findFirst({ where: eq(adminUsers.email, normalized) })) {
    return { success: false, error: INVALID };
  }
  try {
    const [user] = await db.insert(adminUsers).values({
      email: normalized,
      password_hash: await hashPassword(password),
      role: "secretaria",
      ativo: true,
    }).returning({ id: adminUsers.id, email: adminUsers.email, ativo: adminUsers.ativo, created_at: adminUsers.created_at });
    return { success: true, data: user };
  } catch {
    return { success: false, error: INVALID };
  }
}

export async function setSecretariatUserActive(id: string, ativo: boolean) {
  await requireAdmin();
  const user = await db.query.adminUsers.findFirst({
    columns: { id: true },
    where: and(eq(adminUsers.id, id), eq(adminUsers.role, "secretaria")),
  });
  if (!user) return { success: false, error: INVALID };
  try {
    const rows = await db.update(adminUsers).set({ ativo }).where(and(eq(adminUsers.id, id), eq(adminUsers.role, "secretaria"))).returning({ id: adminUsers.id });
    return rows.length ? { success: true } : { success: false, error: INVALID };
  } catch {
    return { success: false, error: INVALID };
  }
}

export async function resetSecretariatPassword(id: string, password: string) {
  await requireAdmin();
  if (!validPassword(password)) return { success: false, error: INVALID };
  const user = await db.query.adminUsers.findFirst({
    columns: { id: true },
    where: and(eq(adminUsers.id, id), eq(adminUsers.role, "secretaria")),
  });
  if (!user) return { success: false, error: INVALID };
  try {
    const rows = await db.update(adminUsers).set({ password_hash: await hashPassword(password) }).where(and(eq(adminUsers.id, id), eq(adminUsers.role, "secretaria"))).returning({ id: adminUsers.id });
    return rows.length ? { success: true } : { success: false, error: INVALID };
  } catch {
    return { success: false, error: INVALID };
  }
}
