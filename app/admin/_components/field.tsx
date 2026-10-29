import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

/**
 * Rótulo + controle + dica/erro. O controle é um render prop que recebe
 * `id`, `aria-describedby` e `aria-invalid` já ligados ao rótulo e à mensagem.
 */
export function Field({
  label,
  hint,
  error,
  id: idProp,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Fixa o `id` do controle (útil quando testes ou âncoras dependem dele). */
  id?: string;
  children: (props: FieldControlProps) => ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": message ? messageId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {message && (
        <p id={messageId} className={cn("text-xs leading-relaxed", error ? "text-danger" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
