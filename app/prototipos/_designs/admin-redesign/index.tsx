"use client";

import { useEffect, useState } from "react";
import { Shell, SCREENS, type ScreenId, type Role } from "./shell";

/**
 * Protótipo: redesenho do painel administrativo.
 * Navegação local (hash) para permitir links diretos: #/solicitacoes etc.
 */
export default function AdminRedesignPrototype() {
  const [screen, setScreen] = useState<ScreenId>("inicio");
  const [role, setRole] = useState<Role>("admin");

  useEffect(() => {
    const read = () => {
      const id = window.location.hash.replace(/^#\/?/, "") as ScreenId;
      if (id && id in SCREENS) setScreen(id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const navigate = (id: ScreenId) => {
    setScreen(id);
    window.history.replaceState(null, "", `#/${id}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/40 bg-cream px-4 py-1.5 text-xs text-muted"
        data-od-id="prototype-banner"
      >
        <span>
          <strong className="font-semibold text-fg">Protótipo</strong> · dados fictícios · redesenho do painel administrativo
        </span>
        <label className="flex items-center gap-2">
          Ver como
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-6 rounded border border-border bg-surface px-1.5 text-xs text-fg"
          >
            <option value="admin">Administração</option>
            <option value="secretaria">Secretaria</option>
          </select>
        </label>
      </div>
      <Shell screen={screen} role={role} onNavigate={navigate} />
    </div>
  );
}
