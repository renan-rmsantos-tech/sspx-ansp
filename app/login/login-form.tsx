"use client";

import { useActionState } from "react";
import type { LoginState } from "./_actions/auth-actions";
import { SealLogo } from "@/components/ui/seal-logo";
import { useServerAction } from "@/components/server-actions";

type LoginFormProps = {
  showCredentialsHint?: boolean;
  hintEmail?: string;
  hintPassword?: string;
};

const initialState: LoginState = { error: null };

export function LoginForm({
  showCredentialsHint = false,
  hintEmail,
  hintPassword,
}: LoginFormProps) {
  const loginAction = useServerAction("loginAction");
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6">
      <div className="w-full max-w-[400px] rounded-md border border-border bg-surface px-8 py-10">
        <div className="mb-8 text-center">
          <SealLogo size={72} className="mx-auto mb-4" />
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Arca N. S. da Providência
          </p>
          <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight">
            Área Administrativa
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Acesso restrito à direção
          </p>
        </div>

        {state.error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-[6px] bg-[oklch(95%_0.04_25)] px-3.5 py-2.5 text-[13px] text-danger"
          >
            {state.error}
          </div>
        )}

        <form action={formAction} noValidate>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-medium tracking-[0.02em]"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username"
              required
              placeholder={showCredentialsHint ? hintEmail : undefined}
              className="w-full rounded-[6px] border border-border bg-bg px-3.5 py-[11px] font-body text-[15px] leading-normal text-fg outline-none transition-colors focus:border-accent focus:ring-3 focus:ring-[oklch(94%_0.02_250)]"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-medium tracking-[0.02em]"
            >
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              className="w-full rounded-[6px] border border-border bg-bg px-3.5 py-[11px] font-body text-[15px] leading-normal text-fg outline-none transition-colors focus:border-accent focus:ring-3 focus:ring-[oklch(94%_0.02_250)]"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-[6px] bg-accent px-3 py-3 text-sm font-medium tracking-[0.02em] text-white transition-colors hover:bg-[oklch(22%_0.06_250)] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {showCredentialsHint && hintEmail && hintPassword && (
          <div className="mt-6 rounded-[6px] bg-[oklch(94%_0.03_80)] px-3 py-3 text-center text-xs leading-normal text-muted">
            Para demonstração:{" "}
            <strong className="text-fg">{hintEmail}</strong> /{" "}
            <strong className="text-fg">{hintPassword}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
