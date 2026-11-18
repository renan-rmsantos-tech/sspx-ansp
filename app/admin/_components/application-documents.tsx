"use client";

import { useEffect, useState } from "react";
import { useServerAction } from "@/components/server-actions";
import { DocumentPreview } from "./document-preview";
import { DocumentRequests } from "./document-requests";
import { EmptyState } from "./empty-state";
import { Notice } from "./notice";

type DocumentRow = Record<string, unknown>;

/**
 * Documentos enviados pela família e pendências de reenvio, para quem não
 * carrega o detalhe completo da solicitação (a Secretaria).
 */
export function ApplicationDocuments({
  applicationId,
  students,
}: {
  applicationId: string;
  students: Array<{ id: string; nome: string }>;
}) {
  const getApplicationDocuments = useServerAction("getApplicationDocuments");
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApplicationDocuments(applicationId)
      .then((result) => {
        if (cancelled) return;
        if (result.data) setDocuments(result.data as DocumentRow[]);
        else setError(result.error ?? "Erro ao carregar os documentos.");
      })
      .catch(() => !cancelled && setError("Erro ao carregar os documentos."));
    return () => {
      cancelled = true;
    };
  }, [applicationId, getApplicationDocuments]);

  return (
    <div className="space-y-6" data-testid="application-documents">
      {error ? (
        <Notice tone="danger">{error}</Notice>
      ) : !documents ? (
        <p className="text-sm text-muted">Carregando documentos…</p>
      ) : documents.length > 0 ? (
        <DocumentPreview documents={documents} />
      ) : (
        <EmptyState
          title="Nenhum documento enviado"
          description="A família não anexou documentos a esta solicitação."
          className="py-8"
        />
      )}
      <DocumentRequests applicationId={applicationId} students={students} />
    </div>
  );
}
