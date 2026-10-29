import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { WARN_TEXT_CLASS } from "./status-pill";

type NoticeTone = "neutral" | "success" | "danger" | "warn";

const TONE_BOX: Record<NoticeTone, string> = {
  neutral: "border-border bg-cream/60",
  success: "border-success/30 bg-success/8",
  danger: "border-danger/30 bg-danger/8",
  warn: "border-warn/40 bg-warn/10",
};

const TONE_ICON: Record<NoticeTone, string> = {
  neutral: "text-accent",
  success: "text-success",
  danger: "text-danger",
  warn: WARN_TEXT_CLASS,
};

/** Aviso contextual. `danger` anuncia como `alert`; os demais como `status`. */
export function Notice({
  tone = "neutral",
  title,
  children,
  action,
  role,
  className,
  "data-testid": testId,
}: {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
  className?: string;
  "data-testid"?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : tone === "neutral" ? Info : CircleAlert;
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      data-testid={testId}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm text-fg", TONE_BOX[tone], className)}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[tone])} />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-0.5 text-muted")}>{children}</div>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
