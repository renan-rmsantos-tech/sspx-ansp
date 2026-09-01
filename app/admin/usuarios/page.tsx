import { requireAdmin } from "@/lib/auth/authorization";
import { listSecretariatUsers } from "../_actions/staff-actions";
import { UsuariosClient } from "./client";

export default async function UsuariosPage() {
  await requireAdmin();
  const users = await listSecretariatUsers();
  return <div><h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">Usuários da Secretaria</h1><p className="mt-1 text-sm text-muted">Crie e administre acessos individuais da Secretaria.</p><div className="mt-6"><UsuariosClient initialUsers={users} /></div></div>;
}
