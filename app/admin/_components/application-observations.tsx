"use client";

import { useEffect, useState } from "react";
import { getApplicationObservations } from "../_actions/observation-actions";

type Observation = { id: string; body: string; created_at: string; author_user?: { email: string } | null };

/** Observações internas registradas pela Secretaria (somente leitura para a Administração). */
export function ApplicationObservations({ applicationId }: { applicationId: string }) {
  const [items, setItems] = useState<Observation[]>([]);

  useEffect(() => {
    void getApplicationObservations(applicationId).then((result) => setItems(result as Observation[]));
  }, [applicationId]);

  return (
    <section>
      <h3 className="text-sm font-semibold text-fg">Observações internas</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhuma observação registrada.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.id} className="py-2 text-sm">
              <p className="text-fg">{item.body}</p>
              <p className="mt-0.5 text-xs text-muted">
                {item.author_user?.email ?? "Secretaria"} · {new Date(item.created_at).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
