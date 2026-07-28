"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  BYPASS_EMAIL,
  BYPASS_PASSWORD,
  BYPASS_USER,
  isAuthBypass,
} from "@/lib/auth/bypass";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";

export type LoginState = { error: string | null };

const INVALID = "Credenciais inválidas. Verifique seu email e senha.";

// Destino do login. Aponta para a página final, e não para /admin: aquela rota
// só redireciona para cá, e um redirect encadeado dentro de uma Server Action
// faz o Next seguir o Location no fetch e devolver HTML onde o roteador espera
// um payload RSC — a navegação quebra com "An unexpected response was received
// from the server", mesmo com a sessão já criada.
const AFTER_LOGIN = "/admin/solicitacoes";

async function startSession(userId: string, email: string) {
  const session = await getSession();
  session.userId = userId;
  session.email = email;
  await session.save();
}

async function authenticate(
  email: string,
  password: string
): Promise<LoginState> {
  if (isAuthBypass()) {
    if (email === BYPASS_EMAIL && password === BYPASS_PASSWORD) {
      await startSession(BYPASS_USER.id, BYPASS_USER.email);
      return { error: null };
    }
    return { error: INVALID };
  }

  const normalized = (email ?? "").trim().toLowerCase();

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, normalized),
  });

  if (!user || !(await verifyPassword(password ?? "", user.password_hash))) {
    return { error: INVALID };
  }

  await startSession(user.id, user.email);

  return { error: null };
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const result = await authenticate(email, password);

  if (!result.error) {
    redirect(AFTER_LOGIN);
  }

  return result;
}

export async function login(email: string, password: string) {
  const result = await authenticate(email, password);

  if (!result.error) {
    redirect(AFTER_LOGIN);
  }

  return result;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
