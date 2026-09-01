"use client";

import { useState } from "react";
import { createSecretariatUser, resetSecretariatPassword, setSecretariatUserActive } from "../_actions/staff-actions";

type User = { id: string; email: string; ativo: boolean; created_at: string };

export function UsuariosClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function create() { const result = await createSecretariatUser(email, password); if (!result.success || !result.data) { setError(result.error ?? "Não foi possível criar o acesso."); return; } setUsers((current) => [...current, result.data]); setEmail(""); setPassword(""); setError(null); }
  async function toggle(user: User) { const result = await setSecretariatUserActive(user.id, !user.ativo); if (result.success) setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ativo: !item.ativo } : item)); else setError(result.error ?? "Não foi possível atualizar o acesso."); }
  async function reset(user: User) { const next = window.prompt(`Nova senha para ${user.email} (mínimo 8 caracteres):`); if (!next) return; const result = await resetSecretariatPassword(user.id, next); if (!result.success) setError(result.error ?? "Não foi possível redefinir a senha."); else setError(null); }
  return <div className="space-y-6"><section className="rounded-lg border border-border bg-surface p-4"><h2 className="font-semibold">Novo acesso</h2><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="email@exemplo.com" className="rounded-md border border-border px-3 py-2 text-sm" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Senha inicial (mínimo 8)" className="rounded-md border border-border px-3 py-2 text-sm" /><button type="button" onClick={() => void create()} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">Criar acesso</button></div>{error && <p className="mt-2 text-sm text-danger">{error}</p>}</section><section className="space-y-3">{users.length === 0 ? <p className="text-sm text-muted">Nenhum acesso da Secretaria cadastrado.</p> : users.map((user) => <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"><div><p className="font-medium">{user.email}</p><p className="text-sm text-muted">{user.ativo ? "Ativo" : "Inativo"}</p></div><div className="flex gap-2"><button type="button" onClick={() => void reset(user)} className="rounded-md border border-border px-3 py-1.5 text-sm">Redefinir senha</button><button type="button" onClick={() => void toggle(user)} className="rounded-md border border-border px-3 py-1.5 text-sm">{user.ativo ? "Desativar" : "Reativar"}</button></div></article>)}</section></div>;
}
