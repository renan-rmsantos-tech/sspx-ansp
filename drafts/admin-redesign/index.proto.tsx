import { definePrototype, setParam, type PrototypeProps } from "@compozy/proto";
import { SCREENS, Shell, type Role, type ScreenId } from "./shell";

export const meta = definePrototype({
  title: "Painel administrativo — redesenho",
  roles: ["admin", "secretaria"],
  states: [
    { id: "inicio", label: "Início" },
    { id: "solicitacoes", label: "Solicitações" },
    { id: "ano-letivo", label: "Ano letivo" },
    { id: "benfeitores", label: "Benfeitores" },
    { id: "pagamentos", label: "Pagamentos" },
    { id: "comunicacoes", label: "E-mails" },
    { id: "relatorios", label: "Relatórios" },
    { id: "modelos", label: "Modelos de documentos" },
    { id: "cabecalho", label: "Cabeçalho e rodapé" },
    { id: "usuarios", label: "Usuários" },
    { id: "padroes", label: "Padrões visuais" },
  ],
});

/** Redesenho do painel com dados fictícios; cada tela é um estado e o menu troca de estado. */
export default function AdminRedesign({ state, role }: PrototypeProps) {
  const screen = (state in SCREENS ? state : "inicio") as ScreenId;
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Shell
        screen={screen}
        role={(role ?? "admin") as Role}
        onNavigate={(id) => {
          setParam("state", id);
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}
