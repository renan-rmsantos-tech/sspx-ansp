import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-5",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
