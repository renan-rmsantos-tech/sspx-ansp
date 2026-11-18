"use client";

import { useActionState, useState, useTransition } from "react";
import type { AccountFormState } from "../_actions/applicant-actions";
import { useServerAction } from "@/components/server-actions";
import {
  AccountAlert,
  AccountCard,
  AccountField,
  AccountLink,
  EmailSentNotice,
  PrimaryButton,
} from "./account-ui";

const EMPTY: AccountFormState = { error: null };
const PASSWORD_HINT = "Use pelo menos 8 caracteres.";

/** Entrada do solicitante; quem ainda não confirmou o e-mail pode pedir um novo link. */
export function ApplicantLoginForm({ initialState = EMPTY }: { initialState?: AccountFormState }) {
  const loginApplicant = useServerAction("loginApplicant");
  const resendVerificationEmail = useServerAction("resendVerificationEmail");
  const [state, formAction, pending] = useActionState(loginApplicant, initialState);
  const [resent, setResent] = useState<AccountFormState | null>(null);
  const [resending, startResend] = useTransition();

  return (
    <AccountCard
      title="Entrar"
      testId="applicant-login"
      description={
        <p>
          Para preencher a solicitação de bolsa, entre com o e-mail e a senha da sua conta. Assim você pode salvar o
          preenchimento, continuar depois e reenviar documentos, se a secretaria pedir.
        </p>
      }
    >
      {state.error && !resent?.sentTo && <AccountAlert>{state.error}</AccountAlert>}
      {state.unverifiedEmail && (
        <div className="mb-4">
          {resent?.sentTo ? (
            <EmailSentNotice email={resent.sentTo} />
          ) : (
            <>
              {resent?.error && <AccountAlert>{resent.error}</AccountAlert>}
              <button
                type="button"
                disabled={resending}
                onClick={() =>
                  startResend(async () => setResent(await resendVerificationEmail(state.unverifiedEmail ?? "")))
                }
                className="w-full rounded-md border border-accent px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-bg disabled:opacity-55"
              >
                {resending ? "Enviando…" : "Reenviar link de confirmação"}
              </button>
            </>
          )}
        </div>
      )}

      <form action={formAction} noValidate>
        <AccountField id="applicant-email" name="email" type="email" label="E-mail" autoComplete="username" />
        <AccountField id="applicant-password" name="password" type="password" label="Senha" autoComplete="current-password" />
        <div className="-mt-2 mb-5 text-right text-sm">
          <AccountLink href="/solicitar-bolsa/esqueci-senha">Esqueci minha senha</AccountLink>
        </div>
        <PrimaryButton pending={pending} pendingLabel="Entrando…">
          Entrar
        </PrimaryButton>
      </form>

      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
        Ainda não tem conta? <AccountLink href="/solicitar-bolsa/cadastro">Criar conta</AccountLink>
      </p>
    </AccountCard>
  );
}

export function ApplicantSignUpForm({ initialState = EMPTY }: { initialState?: AccountFormState }) {
  const signUpApplicant = useServerAction("signUpApplicant");
  const [state, formAction, pending] = useActionState(signUpApplicant, initialState);

  if (state.sentTo) {
    return (
      <AccountCard title="Confirme seu e-mail" testId="applicant-signup-sent">
        <EmailSentNotice email={state.sentTo}>
          <p className="mt-2 text-muted">
            O link de confirmação vale por 48 horas. Depois de confirmar, você já pode preencher a solicitação.
          </p>
        </EmailSentNotice>
        <p className="mt-6 text-center text-sm text-muted">
          Já confirmou? <AccountLink href="/solicitar-bolsa/entrar">Entrar</AccountLink>
        </p>
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title="Criar conta"
      testId="applicant-signup"
      description={
        <p>
          Informe o e-mail do responsável e escolha uma senha. Enviaremos um link para confirmar o e-mail; é por ele
          que a secretaria vai avisar sobre a sua solicitação.
        </p>
      }
    >
      {state.error && <AccountAlert>{state.error}</AccountAlert>}
      <form action={formAction} noValidate>
        <AccountField id="signup-email" name="email" type="email" label="E-mail" autoComplete="email" error={state.fieldErrors?.email} />
        <AccountField
          id="signup-password"
          name="password"
          type="password"
          label="Senha"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={state.fieldErrors?.password}
        />
        <AccountField
          id="signup-confirmation"
          name="confirmation"
          type="password"
          label="Repita a senha"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmation}
        />
        <PrimaryButton pending={pending} pendingLabel="Criando conta…">
          Criar conta
        </PrimaryButton>
      </form>
      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
        Já tem conta? <AccountLink href="/solicitar-bolsa/entrar">Entrar</AccountLink>
      </p>
    </AccountCard>
  );
}

export function ConfirmEmailForm({ token, initialState = EMPTY }: { token: string; initialState?: AccountFormState }) {
  const confirmApplicantEmail = useServerAction("confirmApplicantEmail");
  const [state, formAction, pending] = useActionState(confirmApplicantEmail, initialState);

  return (
    <AccountCard
      title="Confirmar e-mail"
      testId="applicant-confirm"
      description={<p>Confirme seu e-mail para começar a preencher a solicitação de bolsa.</p>}
    >
      {state.error ? (
        <>
          <AccountAlert>{state.error}</AccountAlert>
          <p className="text-center text-sm">
            <AccountLink href="/solicitar-bolsa/entrar">Ir para a entrada</AccountLink>
          </p>
        </>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="token" value={token} />
          <PrimaryButton pending={pending} pendingLabel="Confirmando…">
            Confirmar e-mail
          </PrimaryButton>
        </form>
      )}
    </AccountCard>
  );
}

export function ForgotPasswordForm({ initialState = EMPTY }: { initialState?: AccountFormState }) {
  const requestPasswordReset = useServerAction("requestPasswordReset");
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <AccountCard
      title="Esqueci minha senha"
      testId="applicant-forgot"
      description={!state.sentTo && <p>Informe o e-mail da sua conta. Enviaremos um link para você escolher uma nova senha.</p>}
    >
      {state.sentTo ? (
        <EmailSentNotice email={state.sentTo}>
          <p className="mt-2 text-muted">Se este e-mail tiver uma conta, o link chegará em instantes e vale por 1 hora.</p>
        </EmailSentNotice>
      ) : (
        <>
          {state.error && <AccountAlert>{state.error}</AccountAlert>}
          <form action={formAction} noValidate>
            <AccountField id="forgot-email" name="email" type="email" label="E-mail" autoComplete="email" error={state.fieldErrors?.email} />
            <PrimaryButton pending={pending} pendingLabel="Enviando…">
              Enviar link
            </PrimaryButton>
          </form>
        </>
      )}
      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
        <AccountLink href="/solicitar-bolsa/entrar">Voltar para a entrada</AccountLink>
      </p>
    </AccountCard>
  );
}

export function ResetPasswordForm({ token, initialState = EMPTY }: { token: string; initialState?: AccountFormState }) {
  const resetApplicantPassword = useServerAction("resetApplicantPassword");
  const [state, formAction, pending] = useActionState(resetApplicantPassword, initialState);

  return (
    <AccountCard title="Escolher nova senha" testId="applicant-reset">
      {state.error && (
        <AccountAlert>
          {state.error} <AccountLink href="/solicitar-bolsa/esqueci-senha">Pedir novo link</AccountLink>
        </AccountAlert>
      )}
      <form action={formAction} noValidate>
        <input type="hidden" name="token" value={token} />
        <AccountField
          id="reset-password"
          name="password"
          type="password"
          label="Nova senha"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={state.fieldErrors?.password}
        />
        <AccountField
          id="reset-confirmation"
          name="confirmation"
          type="password"
          label="Repita a nova senha"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmation}
        />
        <PrimaryButton pending={pending} pendingLabel="Salvando…">
          Salvar nova senha
        </PrimaryButton>
      </form>
    </AccountCard>
  );
}

/** Faixa com a conta logada e o botão de sair, acima do formulário. */
export function ApplicantBar({ email }: { email: string }) {
  const logoutApplicant = useServerAction("logoutApplicant");
  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm"
      data-testid="applicant-bar"
    >
      <p className="min-w-0 text-muted">
        Conectado como <strong className="break-all font-medium text-fg">{email}</strong>
      </p>
      <form action={logoutApplicant}>
        <button type="submit" className="font-medium text-accent underline-offset-4 hover:underline">
          Sair
        </button>
      </form>
    </div>
  );
}
