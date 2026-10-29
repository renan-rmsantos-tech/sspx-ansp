import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataGrid({
  children,
  cols = 3,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </dl>
  );
}

/** Par rótulo/valor dentro de `DataGrid`. Valor ausente mostra "—". */
export function DataItem({
  label,
  value,
  className,
  "data-testid": testId,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div className={cn("min-w-0", className)} data-testid={testId}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{value ?? "—"}</dd>
    </div>
  );
}
