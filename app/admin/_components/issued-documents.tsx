"use client";

import { useEffect, useState } from "react";
import { getCurrentIssuedDocuments, getIssuedDocumentHistory, getIssuedDocumentUrl } from "../_actions/admin-actions";

type Document = { id: string; kind: "decision" | "contract"; version: number; filename: string; issued_at: string };

export function IssuedDocuments({ applicationId }: { applicationId: string }) {
  const [current, setCurrent] = useState<Document[]>([]);
  const [history, setHistory] = useState<Document[]>([]);
  useEffect(() => { void Promise.all([getCurrentIssuedDocuments(applicationId), getIssuedDocumentHistory(applicationId)]).then(([items, versions]) => { setCurrent(items as Document[]); setHistory(versions as Document[]); }); }, [applicationId]);
  async function download(id: string) { const result = await getIssuedDocumentUrl(id); if ("url" in result) window.open(result.url, "_blank", "noopener,noreferrer"); }
  return <section className="mt-4 border-t border-border pt-3"><h3 className="text-sm font-semibold text-fg">Documentos finais emitidos</h3>{current.length === 0 ? <p className="mt-1 text-sm text-muted">Nenhum documento final emitido.</p> : <ul className="mt-2 space-y-2">{current.map((document) => <li key={document.id} className="flex items-center justify-between text-sm"><span>{document.kind === "decision" ? "Decisão" : "Contrato"} · versão {document.version}</span><button type="button" onClick={() => void download(document.id)} className="text-accent hover:underline">Baixar</button></li>)}</ul>}{history.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-accent">Histórico administrativo ({history.length})</summary><ul className="mt-2 space-y-1">{history.map((document) => <li key={document.id} className="flex items-center justify-between"><span>{document.kind === "decision" ? "Decisão" : "Contrato"} · versão {document.version}</span><button type="button" onClick={() => void download(document.id)} className="text-accent hover:underline">Baixar</button></li>)}</ul></details>}</section>;
}
