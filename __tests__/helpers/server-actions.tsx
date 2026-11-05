import type { ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { ServerActionsProvider, type ServerActions } from "@/components/server-actions";

/**
 * `render` com um `ServerActionsProvider` em volta. Recebe os módulos de
 * actions já trocados por `vi.mock` (ou objetos com as funções), como o
 * layout entrega as actions reais às views em produção.
 */
export function withServerActions(...modules: object[]) {
  const actions = Object.assign({}, ...modules) as Partial<ServerActions>;
  function Wrapper({ children }: { children: ReactNode }) {
    return <ServerActionsProvider actions={actions}>{children}</ServerActionsProvider>;
  }
  return (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
    render(ui, { wrapper: Wrapper, ...options });
}
