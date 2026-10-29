import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "warn" | "success" | "danger" | "accent";

/**
 * Texto do tom `warn` escurecido por contraste (herdado do protótipo). É uma
 * constante local, não um token de `app/globals.css`.
 */
export const WARN_TEXT_CLASS = "text-[oklch(45%_0.12_70)]";

export const TONE_DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-muted",
  warn: "bg-warn",
  success: "bg-success",
  danger: "bg-danger",
  accent: "bg-accent",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-border bg-bg text-muted",
  warn: `border-warn/30 bg-warn/12 ${WARN_TEXT_CLASS}`,
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
  accent: "border-accent/20 bg-accent/8 text-accent",
};

export function StatusPill({
  tone = "neutral",
  dot = true,
  children,
  className,
  "data-testid": testId,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASS[tone])} />}
      {children}
    </span>
  );
}
