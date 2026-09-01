import { eq } from "drizzle-orm";
import { BYPASS_USER, isAuthBypass } from "@/lib/auth/bypass";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";

export type StaffRole = "admin" | "secretaria";

export type Capability =
  | "applications:read-full"
  | "applications:read-operational"
  | "applications:decide"
  | "observations:read"
  | "observations:create"
  | "donors:read-operational"
  | "donors:manage"
  | "issued-documents:read"
  | "issued-documents:issue"
  | "settings:manage"
  | "staff:manage";

export interface StaffIdentity {
  id: string;
  email: string;
  role: StaffRole;
  ativo: boolean;
}

const SECRETARIAT_CAPABILITIES = new Set<Capability>([
  "applications:read-operational",
  "observations:read",
  "observations:create",
  "donors:read-operational",
  "issued-documents:read",
]);

const UNAUTHORIZED = "Não autorizado. Faça login para continuar.";
const FORBIDDEN = "Você não tem permissão para realizar esta ação.";

/**
 * Resolve a identidade atual no banco a cada operação protegida. A sessão é
 * somente uma pista de identidade, nunca a fonte de papel ou atividade.
 */
export async function requireStaff(): Promise<StaffIdentity> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) throw new Error(UNAUTHORIZED);

  if (isAuthBypass() && sessionUser.id === BYPASS_USER.id) {
    return { ...BYPASS_USER, role: "admin", ativo: true };
  }

  const user = await db.query.adminUsers.findFirst({
    columns: { id: true, email: true, role: true, ativo: true },
    where: eq(adminUsers.id, sessionUser.id),
  });

  if (!user || !user.ativo) throw new Error(UNAUTHORIZED);

  return user;
}

export async function requireAdmin(): Promise<StaffIdentity> {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new Error(FORBIDDEN);
  return staff;
}

export async function requireCapability(
  capability: Capability
): Promise<StaffIdentity> {
  const staff = await requireStaff();

  if (
    staff.role !== "admin" &&
    !SECRETARIAT_CAPABILITIES.has(capability)
  ) {
    throw new Error(FORBIDDEN);
  }

  return staff;
}
