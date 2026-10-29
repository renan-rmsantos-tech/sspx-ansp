import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { WARN_TEXT_CLASS } from "./status-pill";

/** Contador em tom de atenção usado nos itens do menu. */
export function CountBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-warn/15 px-1.5 text-[11px] font-semibold tabular-nums",
        WARN_TEXT_CLASS,
        className
      )}
      {...props}
    />
  );
}
