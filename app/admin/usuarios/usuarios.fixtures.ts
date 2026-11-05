import type { ComponentProps } from "react";
import type { UsuariosClient } from "./client";

type SecretariatUser = ComponentProps<typeof UsuariosClient>["initialUsers"][number];

export const secretariatUsers: SecretariatUser[] = [
  {
    id: "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e51",
    email: "secretaria@arcansp.org.br",
    ativo: true,
    created_at: "2026-02-10T13:00:00.000Z",
  },
  {
    id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f62",
    email: "maria.souza@arcansp.org.br",
    ativo: true,
    created_at: "2026-05-18T17:30:00.000Z",
  },
  {
    id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a73",
    email: "jose.ferreira@arcansp.org.br",
    ativo: false,
    created_at: "2025-08-04T12:15:00.000Z",
  },
];

/** Mensagem que `createSecretariatUser` devolve em qualquer recusa. */
export const createUserError = "Não foi possível concluir a operação.";
