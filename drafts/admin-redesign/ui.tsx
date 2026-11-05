"use client";

/**
 * Primitivas de composição do protótipo. Usam somente tokens de
 * app/globals.css e o Button de components/ui. Cada bloco documenta o padrão
 * que a implementação deve reproduzir (idealmente via `shadcn add`).
 */

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, CircleAlert, CircleCheck, Info, Search } from "lucide-react";

/* ---------------------------------------------------------------- Página */

export function PageHeader({
  title,
  description,
  action,
  odId,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  odId?: string;
}) {
  return (
    <header
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-5"
      data-od-id={odId}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-fg">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  aside,
  className,
  odId,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  odId?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)} data-od-id={odId}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={id} className="font-heading text-lg font-semibold leading-tight text-fg">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  className,
  padded = true,
  odId,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  odId?: string;
}) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface", padded && "p-5", className)}
      data-od-id={odId}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- Status */

export type Tone = "neutral" | "warn" | "success" | "danger" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-bg text-muted border-border",
  warn: "bg-warn/12 text-[oklch(45%_0.12_70)] border-warn/30",
  success: "bg-success/10 text-success border-success/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  accent: "bg-accent/8 text-accent border-accent/20",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-muted",
  warn: "bg-warn",
  success: "bg-success",
  danger: "bg-danger",
  accent: "bg-accent",
};

export function StatusPill({ tone = "neutral", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone]
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {children}
    </span>
  );
}

export function CountBadge({ children }: { children: ReactNode }) {
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-warn/15 px-1.5 text-[11px] font-semibold tabular-nums text-[oklch(45%_0.12_70)]">
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Avisos */

export function Notice({
  tone = "neutral",
  title,
  children,
  action,
}: {
  tone?: "neutral" | "success" | "danger" | "warn";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === "success" ? CircleCheck : tone === "danger" || tone === "warn" ? CircleAlert : Info;
  const color =
    tone === "success"
      ? "border-success/30 bg-success/8 text-fg"
      : tone === "danger"
        ? "border-danger/30 bg-danger/8 text-fg"
        : tone === "warn"
          ? "border-warn/40 bg-warn/10 text-fg"
          : "border-border bg-cream/60 text-fg";
  const iconColor =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warn" ? "text-[oklch(45%_0.12_70)]" : "text-accent";
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", color)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", iconColor)} />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-0.5 text-muted")}>{children}</div>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Formulário */

const CONTROL =
  "w-full rounded-md border border-border bg-surface px-3 text-sm text-fg placeholder:text-muted/80 outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-50 aria-invalid:border-danger";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = hint || error ? hintId : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {(error || hint) && (
        <p id={hintId} className={cn("text-xs leading-relaxed", error ? "text-danger" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, "h-10", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL, "min-h-24 py-2 leading-relaxed", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(CONTROL, "h-10 appearance-none pr-9", props.className)} />
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, "h-10 pl-9")}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Dados */

export function DataItem({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{value ?? "—"}</dd>
    </div>
  );
}

export function DataGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {children}
    </dl>
  );
}

/* ------------------------------------------------------------- Segmentos */

export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  odId,
}: {
  label: string;
  options: Array<{ value: T; label: string; count?: number; tone?: Tone }>;
  value: T;
  onChange: (value: T) => void;
  odId?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-lg border border-border bg-bg p-1" data-od-id={odId}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              active ? "bg-surface text-fg shadow-[inset_0_0_0_1px_var(--color-border)]" : "text-muted hover:text-fg"
            )}
          >
            {opt.tone && <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[opt.tone])} />}
            {opt.label}
            {opt.count != null && (
              <span className={cn("text-xs tabular-nums", active ? "text-muted" : "text-muted/70")}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Abas */

export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
}: {
  label: string;
  tabs: Array<{ id: T; label: string; badge?: ReactNode }>;
  value: T;
  onChange: (id: T) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={cn(
                "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                active ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
              )}
            >
              {tab.label}
              {tab.badge}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`} className="pt-5">
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Registros */

/**
 * Linha de registro expansível: cabeçalho enxuto (nome, resumo, estado) com
 * um único gatilho; ações e detalhes só aparecem expandidos.
 */
export function RecordRow({
  title,
  meta,
  status,
  children,
  defaultOpen = false,
  odId,
}: {
  title: ReactNode;
  meta: ReactNode;
  status: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  odId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <article className={cn("rounded-lg border bg-surface transition-colors", open ? "border-accent/40" : "border-border")} data-od-id={odId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-col gap-3 rounded-lg px-5 py-4 text-left outline-none hover:bg-bg/60 focus-visible:ring-2 focus-visible:ring-accent/40 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 sm:flex-1">
          <div className="text-base font-semibold text-fg">{title}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">{meta}</div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
          {status}
          <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open && (
        <div id={id} className="border-t border-border px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </article>
  );
}

export function ActionBar({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">{children}</div>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="font-heading text-lg font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-sm text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, hint, tone = "neutral", odId }: { label: string; value: ReactNode; hint?: string; tone?: Tone; odId?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-5 py-4" data-od-id={odId}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        {tone !== "neutral" && <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
        {label}
      </div>
      <div className="mt-2 font-heading text-3xl font-semibold leading-none tabular-nums text-fg">{value}</div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export { Button };
