"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Linha de registro expansível: cabeçalho enxuto (título, resumo, situação)
 * com um único gatilho; o detalhe só é renderizado quando aberto.
 * Funciona não controlada (`defaultOpen`) ou controlada (`open` + `onOpenChange`).
 */
export function RecordRow({
  title,
  meta,
  status,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  "data-testid": testId,
  toggleTestId,
  detailTestId,
}: {
  title: ReactNode;
  meta: ReactNode;
  status?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  "data-testid"?: string;
  toggleTestId?: string;
  detailTestId?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internalOpen;
  const panelId = useId();

  function toggle() {
    const next = !open;
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <article
      data-testid={testId}
      className={cn(
        "rounded-lg border bg-surface transition-colors motion-reduce:transition-none",
        open ? "border-accent/40" : "border-border",
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-testid={toggleTestId}
        onClick={toggle}
        className="flex w-full flex-col gap-3 rounded-lg px-5 py-4 text-left outline-none transition-colors hover:bg-bg/60 focus-visible:ring-2 focus-visible:ring-accent/40 motion-reduce:transition-none sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 sm:flex-1">
          <div className="text-base font-semibold text-fg">{title}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">{meta}</div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
          {status}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-muted transition-transform motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open && (
        <div id={panelId} data-testid={detailTestId} className="border-t border-border px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </article>
  );
}
