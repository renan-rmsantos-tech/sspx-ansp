"use client";

import { useEffect, useState } from "react";
import { getApplicationObservations } from "../_actions/observation-actions";

export function ApplicationObservations({ applicationId }: { applicationId: string }) {
  const [items, setItems] = useState<Array<{ id: string; body: string; created_at: string; author_user?: { email: string } }>>([]);
  useEffect(() => { void getApplicationObservations(applicationId).then((result) => setItems(result as typeof items)); }, [applicationId]);
  return <section className="mt-4 border-t border-border pt-3"><h3 className="text-sm font-semibold text-fg">Observações internas</h3>{items.length === 0 ? <p className="mt-1 text-sm text-muted">Nenhuma observação registrada.</p> : <ul className="mt-2 space-y-2">{items.map((item) => <li key={item.id} className="text-sm"><p>{item.body}</p><p className="text-xs text-muted">{item.author_user?.email ?? "Secretaria"} · {new Date(item.created_at).toLocaleString("pt-BR")}</p></li>)}</ul>}</section>;
}
