import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rodapé de ações do detalhe: botões à esquerda, nota opcional à direita. */
export function ActionBar({
  children,
  note,
  className,
}: {
  children: ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4",
        className
      )}
    >
      <div className="flex flex-wrap gap-2">{children}</div>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
