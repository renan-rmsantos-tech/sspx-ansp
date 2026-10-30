"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Confirmação no lugar (nunca em modal) para ações destrutivas. */
export function InlineConfirm({
  question,
  confirmLabel,
  cancelLabel = "Não",
  onConfirm,
  onCancel,
  pending = false,
  confirmTestId,
  cancelTestId,
  className,
  "data-testid": testId,
}: {
  question: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  confirmTestId?: string;
  cancelTestId?: string;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div
      role="group"
      aria-label={question}
      data-testid={testId}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-fg",
        className
      )}
    >
      <p className="font-medium">{question}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="lg"
          variant="destructive"
          onClick={onConfirm}
          disabled={pending}
          data-testid={confirmTestId}
        >
          {confirmLabel}
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={onCancel} disabled={pending} data-testid={cancelTestId}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
