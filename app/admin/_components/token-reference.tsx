"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type TokenEntry = { token: string; desc: string };

/** Lista lateral "Campos disponíveis": cada campo copia o token para a área de transferência. */
export function TokenReference({
  tokens,
  description,
  className,
  "data-testid": testId,
  itemTestId,
}: {
  tokens: readonly TokenEntry[];
  description: string;
  className?: string;
  "data-testid"?: string;
  itemTestId?: string;
}) {
  const headingId = useId();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(token: string) {
    try {
      await navigator.clipboard?.writeText(token);
      setCopied(token);
    } catch {
      setCopied(null);
    }
  }

  return (
    <aside aria-labelledby={headingId} data-testid={testId} className={cn("space-y-3", className)}>
      <h3 id={headingId} className="text-xs font-medium uppercase tracking-wide text-muted">
        Campos disponíveis
      </h3>
      <p className="text-sm text-muted">{description}</p>
      <ul className="space-y-1.5">
        {tokens.map((entry) => (
          <li key={entry.token} data-testid={itemTestId}>
            <button
              type="button"
              onClick={() => void copy(entry.token)}
              className="flex w-full items-baseline gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm outline-none transition-colors hover:border-accent/40 hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent/40 motion-reduce:transition-none"
            >
              <code className="shrink-0 font-mono text-xs text-accent">{entry.token}</code>
              <span className="text-muted">{entry.desc}</span>
            </button>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-muted">
        {copied ? `${copied} copiado.` : ""}
      </p>
    </aside>
  );
}
