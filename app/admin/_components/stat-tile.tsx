import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TONE_DOT_CLASS, type Tone } from "./status-pill";

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
  "data-testid": testId,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div data-testid={testId} className={cn("rounded-lg border border-border bg-surface px-5 py-4", className)}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        {tone !== "neutral" && <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASS[tone])} />}
        {label}
      </div>
      <div className="mt-2 font-heading text-3xl font-semibold leading-none tabular-nums text-fg">{value}</div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
