"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentIssuedDocuments, getIssuedDocumentHistory, getIssuedDocumentUrl } from "../_actions/admin-actions";

type Document = { id: string; kind: "decision" | "contract"; version: number; filename: string; issued_at: string };

function label(document: Document): string {
  return `${document.kind === "decision" ? "Carta de decisão" : "Contrato"} · versão ${document.version}`;
}

/** Documentos finais já emitidos (versão atual e histórico) para a Administração. */
export function IssuedDocuments({ applicationId }: { applicationId: string }) {
  const [current, setCurrent] = useState<Document[]>([]);
  const [history, setHistory] = useState<Document[]>([]);

  useEffect(() => {
    void Promise.all([getCurrentIssuedDocuments(applicationId), getIssuedDocumentHistory(applicationId)]).then(
      ([items, versions]) => {
        setCurrent(items as Document[]);
        setHistory(versions as Document[]);
      }
    );
  }, [applicationId]);

  async function download(id: string) {
    const result = await getIssuedDocumentUrl(id);
    if ("url" in result) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-fg">Documentos finais emitidos</h3>
      {current.length === 0 ? (
        <p className="text-sm text-muted">Nenhum documento final emitido.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {current.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg/50 px-3 py-2 text-sm"
            >
              <span className="truncate">{label(document)}</span>
              <Button variant="ghost" size="sm" onClick={() => void download(document.id)}>
                Baixar
              </Button>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-accent">Histórico administrativo ({history.length})</summary>
          <ul className="mt-2 divide-y divide-border/60">
            {history.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-muted">{label(document)}</span>
                <Button variant="ghost" size="sm" onClick={() => void download(document.id)}>
                  Baixar
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
