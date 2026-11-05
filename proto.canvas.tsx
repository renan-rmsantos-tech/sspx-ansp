import "./app/globals.css";

import type { CanvasProps, FrameProps } from "@compozy/proto";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { ServerActionsProvider } from "@/components/server-actions";
import type { StaffRole } from "@/lib/auth/authorization";
import { PathnameProvider } from "./proto/next/navigation";
import { fixtureActions } from "./proto/server-actions.fixtures";

const BASELINE_ACTIONS = fixtureActions();

/**
 * O layout raiz só aplica `globals.css`. As views chamam server actions pelo
 * contexto; aqui toda action resolve sem servidor, e cada protótipo sobrepõe
 * as que seus estados precisam com outro `ServerActionsProvider`.
 */
export function Canvas({ children }: CanvasProps) {
  return <ServerActionsProvider actions={BASELINE_ACTIONS}>{children}</ServerActionsProvider>;
}

const STAFF: Record<StaffRole, { email: string; role: StaffRole }> = {
  admin: { email: "admin@arcansp.org.br", role: "admin" },
  secretaria: { email: "secretaria@arcansp.org.br", role: "secretaria" },
};

const COUNTS = { pendingApplications: 4, pendingWelcome: 2 };

/** A casca real do painel em volta dos protótipos de componente; `route` marca o item ativo. */
export function Frame({ route, role, children }: FrameProps) {
  return (
    <PathnameProvider pathname={route}>
      <AdminShell staff={STAFF[role === "secretaria" ? "secretaria" : "admin"]} counts={COUNTS} onLogout={async () => {}}>
        {children}
      </AdminShell>
    </PathnameProvider>
  );
}
