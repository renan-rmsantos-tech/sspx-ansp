import { requireAdmin } from "@/lib/auth/authorization";
import { listSecretariatUsers } from "../_actions/staff-actions";
import { UsuariosClient } from "./client";

export default async function UsuariosPage() {
  await requireAdmin();
  const users = await listSecretariatUsers();
  return <UsuariosClient initialUsers={users} />;
}
