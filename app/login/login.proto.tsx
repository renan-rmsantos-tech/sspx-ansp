import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider } from "@/components/server-actions";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { LoginForm } from "./login-form";
import { devCredentials, invalidCredentialsError, invalidCredentialsState } from "./login.fixtures";

export const meta = definePrototype({
  title: "Login da área administrativa",
  spec: "publico",
  route: "/login",
  standalone: true,
  states: [
    { id: "padrao", label: "Padrão" },
    { id: "erro-credencial", label: "Credenciais inválidas" },
    { id: "credenciais-dev", label: "Dica de credenciais de desenvolvimento" },
  ],
});

const invalidLoginActions = fixtureActions({ loginAction: async () => invalidCredentialsState });

export default function Prototype({ state }: PrototypeProps) {
  if (state === "erro-credencial") {
    return (
      <ServerActionsProvider actions={invalidLoginActions}>
        <LoginForm initialError={invalidCredentialsError} />
      </ServerActionsProvider>
    );
  }
  return (
    <LoginForm
      showCredentialsHint={state === "credenciais-dev"}
      hintEmail={devCredentials.email}
      hintPassword={devCredentials.password}
    />
  );
}
