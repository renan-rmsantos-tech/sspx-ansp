import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider } from "@/components/server-actions";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { UsuariosClient } from "./client";
import { createUserError, secretariatUsers } from "./usuarios.fixtures";

export const meta = definePrototype({
  title: "Usuários da Secretaria",
  route: "/admin/usuarios",
  roles: ["admin"],
  states: [
    { id: "ativos-e-inativos", label: "Acessos ativos e inativos" },
    { id: "sem-acessos", label: "Nenhum acesso cadastrado" },
    { id: "erro-ao-criar", label: "Falha ao criar acesso" },
  ],
});

/** Criar devolve o usuário novo no formato da action; no estado de erro, a recusa genérica. */
const READY = fixtureActions({
  createSecretariatUser: async (email) => ({
    success: true,
    data: { id: "f4a5b6c7-d8e9-4f0a-8b2c-3d4e5f6a7b84", email: email.trim().toLowerCase(), ativo: true, created_at: "2026-11-04T15:00:00.000Z" },
  }),
});

const FAILING = fixtureActions({
  createSecretariatUser: async () => ({ success: false, error: createUserError }),
});

export default function Prototype({ state }: PrototypeProps) {
  const failing = state === "erro-ao-criar";

  return (
    <ServerActionsProvider actions={failing ? FAILING : READY}>
      <UsuariosClient
        initialUsers={state === "sem-acessos" ? [] : secretariatUsers}
        initialFormError={failing ? createUserError : undefined}
      />
    </ServerActionsProvider>
  );
}
