"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FieldError, inputClass } from "@/app/form/_components/field-ui";

/** Cartão das telas de conta do solicitante (entrar, criar conta, senha). */
export function AccountCard({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      aria-labelledby="account-card-title"
      className="mx-auto max-w-[460px] rounded-xl border border-border bg-surface p-7 max-sm:p-5"
      data-testid={testId}
    >
      <h2 id="account-card-title" className="font-display text-[22px] font-semibold leading-snug text-fg">
        {title}
      </h2>
      {description && <div className="mt-2 text-[15px] leading-relaxed text-muted">{description}</div>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AccountField({
  id,
  label,
  type = "text",
  name,
  autoComplete,
  error,
  hint,
  defaultValue,
}: {
  id: string;
  label: string;
  type?: "email" | "password" | "text";
  name: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  defaultValue?: string;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={inputClass(Boolean(error))}
      />
      <FieldError error={error} id={`${id}-error`} />
    </div>
  );
}

export function AccountAlert({ tone = "danger", children }: { tone?: "danger" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`mb-4 rounded-md px-3.5 py-2.5 text-sm ${
        tone === "danger" ? "bg-danger/5 text-danger" : "bg-accent/5 text-fg"
      }`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ pending, children, pendingLabel }: { pending?: boolean; children: ReactNode; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent px-6 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-accent/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function AccountLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

/** Confirmação de que um link foi enviado por e-mail. */
export function EmailSentNotice({ email, children }: { email: string; children?: ReactNode }) {
  return (
    <div role="status" className="rounded-md border border-border bg-bg px-4 py-4 text-[15px] leading-relaxed text-fg" data-testid="email-sent">
      <p>
        Enviamos uma mensagem para <strong className="break-all">{email}</strong>.
      </p>
      <p className="mt-2 text-muted">
        Abra o e-mail e siga as instruções. Se não encontrar a mensagem em alguns minutos, procure também na caixa de
        spam ou lixo eletrônico.
      </p>
      {children}
    </div>
  );
}
