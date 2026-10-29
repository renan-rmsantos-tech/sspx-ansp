"use client";

import { cn } from "@/lib/utils";
import { TONE_DOT_CLASS, type Tone } from "./status-pill";

export function SegmentedFilter<T extends string>({
  label,
  value,
  onChange,
  options,
  testIdPrefix,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number; tone?: Tone }>;
  /** Gera `${testIdPrefix}-${value}` em cada botão. */
  testIdPrefix?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-1 rounded-lg border border-border bg-bg p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            data-testid={testIdPrefix ? `${testIdPrefix}-${option.value}` : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 motion-reduce:transition-none",
              active ? "bg-surface text-fg shadow-[inset_0_0_0_1px_var(--color-border)]" : "text-muted hover:text-fg"
            )}
          >
            {option.tone && <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASS[option.tone])} />}
            {option.label}
            {option.count != null && (
              <>
                {" "}
                <span className={cn("text-xs tabular-nums", active ? "text-muted" : "text-muted/70")}>{option.count}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
