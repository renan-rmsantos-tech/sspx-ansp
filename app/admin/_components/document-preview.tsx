"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "./modal";
import { Notice } from "./notice";
import { useServerAction } from "@/components/server-actions";
import { documentLabel } from "@/lib/applicant/document-labels";

interface Document {
  id: string;
  application_id: string;
  categoria: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string;
}

interface DocumentPreviewProps {
  documents: Array<Record<string, unknown>>;
}

function resolveCategoryLabel(categoria: string): string {
  return documentLabel(categoria);
}

async function downloadFromSignedUrl(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("download failed");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export function DocumentPreview({ documents }: DocumentPreviewProps) {
  const getDocumentUrl = useServerAction("getDocumentUrl");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docs = documents as unknown as Document[];

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewName("");
  }, []);

  const handlePreview = useCallback(async (doc: Document) => {
    setLoading(doc.id);
    setError(null);
    const result = await getDocumentUrl(doc.storage_path, doc.application_id);
    if ("url" in result) {
      setPreviewUrl(result.url);
      setPreviewName(doc.nome_arquivo);
    } else {
      setError(result.error);
    }
    // Só limpa se ainda for o loading deste documento — outra ação pode
    // ter começado enquanto esta aguardava o servidor.
    setLoading((prev) => (prev === doc.id ? null : prev));
  }, [getDocumentUrl]);

  const handleDownload = useCallback(async (doc: Document) => {
    setLoading(doc.id);
    setError(null);
    const result = await getDocumentUrl(doc.storage_path, doc.application_id);
    if ("url" in result) {
      try {
        await downloadFromSignedUrl(result.url, doc.nome_arquivo);
      } catch {
        setError("Erro ao baixar o documento.");
      }
    } else {
      setError(result.error);
    }
    setLoading((prev) => (prev === doc.id ? null : prev));
  }, [getDocumentUrl]);

  return (
    <div className="space-y-3" data-testid="documents-section">
      <ul className="grid gap-2 sm:grid-cols-2">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg/50 px-3 py-2 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">
                {resolveCategoryLabel(doc.categoria)}
              </span>
              <span className="block truncate text-xs text-muted">{doc.nome_arquivo}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              {doc.mime_type === "application/pdf" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(doc)}
                  disabled={loading === doc.id}
                  data-testid={`preview-${doc.id}`}
                >
                  Abrir
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(doc)}
                disabled={loading === doc.id}
                data-testid={`download-${doc.id}`}
              >
                Baixar
              </Button>
            </span>
          </li>
        ))}
      </ul>

      {error && (
        <Notice tone="danger" data-testid="document-error">
          {error}
        </Notice>
      )}

      <Modal
        open={!!previewUrl}
        onClose={closePreview}
        title={previewName}
        testId="pdf-preview"
        size="lg"
      >
        {previewUrl && (
          <iframe
            src={previewUrl}
            title={previewName}
            className="h-full w-full border-0 bg-bg"
          />
        )}
      </Modal>
    </div>
  );
}
