"use client";

// Primitivas compartilhadas para padronizar a apresentação de campos
// obrigatórios em todos os steps do formulário:
//  - asterisco vermelho padrão (RequiredMark)
//  - campo "todo vermelho" quando inválido (inputClass / fieldBorder)
//  - mensagem padrão de erro (FieldError)

export const MSG_OBRIGATORIO = "Campo obrigatório";

export function RequiredMark() {
  return (
    <span className="text-danger" aria-hidden="true">
      {" *"}
    </span>
  );
}

// Classes de borda/fundo padronizadas: campo fica vermelho quando há erro.
export function fieldBorder(hasError?: boolean): string {
  return hasError
    ? "border-danger bg-danger/5"
    : "border-border bg-bg";
}

// className completo padrão para inputs/selects de texto.
export function inputClass(hasError?: boolean): string {
  return `w-full rounded-md border px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(hasError)}`;
}

export function FieldError({ error, id }: { error?: string; id?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-danger" role="alert">
      {error}
    </p>
  );
}
