"use client";

import { useState, useCallback } from "react";
import { getDocumentUrl } from "../_actions/admin-actions";
import { Modal } from "./modal";

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

const CATEGORY_LABELS: Record<string, string> = {
  rg_pai: "RG do Pai",
  rg_mae: "RG da Mãe",
  certidao: "Certidão de Casamento",
  comprovante_endereco: "Comprovante de Endereço",
  extrato_ir: "Extrato IR",
  extrato_bancario: "Extrato Bancário",
  rg_aluno: "RG do Aluno",
  certidao_nascimento: "Certidão de Nascimento",
};

function resolveCategoryLabel(categoria: string, storagePath: string): string {
  if (CATEGORY_LABELS[categoria]) return CATEGORY_LABELS[categoria];
  if (categoria.startsWith("certidao_nascimento") || storagePath.includes("certidao_nascimento")) {
    return "Certidão de Nascimento";
  }
  if (categoria.startsWith("rg_aluno") || storagePath.includes("/rg_aluno")) {
    return "RG do Aluno";
  }
  return categoria;
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
  }, []);

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
  }, []);

  return (
    <div data-testid="documents-section">
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span className="text-muted">
              {resolveCategoryLabel(doc.categoria, doc.storage_path)}:
            </span>
            <span className="text-fg">{doc.nome_arquivo}</span>
            <div className="flex gap-1">
              {doc.mime_type === "application/pdf" && (
                <button
                  type="button"
                  onClick={() => handlePreview(doc)}
                  disabled={loading === doc.id}
                  className="rounded border border-border px-2 py-0.5 text-xs text-accent hover:bg-bg disabled:opacity-50"
                  data-testid={`preview-${doc.id}`}
                >
                  {loading === doc.id ? "..." : "Visualizar"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDownload(doc)}
                disabled={loading === doc.id}
                className="rounded border border-border px-2 py-0.5 text-xs text-accent hover:bg-bg disabled:opacity-50"
                data-testid={`download-${doc.id}`}
              >
                Baixar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-2 text-sm text-danger" data-testid="document-error">
          {error}
        </p>
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
