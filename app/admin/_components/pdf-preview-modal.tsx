"use client";

import { useEffect, useMemo, useRef } from "react";

interface PdfPreviewModalProps {
  pdfBase64: string;
  filename: string;
  title?: string;
  onClose: () => void;
}

// Visualização de PDF em overlay, com opções de imprimir e baixar.
// Usa <dialog> nativo: showModal() prende o foco dentro do diálogo e o
// devolve ao elemento que o abriu quando fechado — teclado não alcança o
// conteúdo atrás do overlay.
export function PdfPreviewModal({
  pdfBase64,
  filename,
  title = "Visualizar PDF",
  onClose,
}: PdfPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const url = useMemo(() => {
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [pdfBase64]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    // Libera o blob ao desmontar.
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clique no backdrop (o próprio <dialog>) fecha; cliques no conteúdo não.
        if (e.target === e.currentTarget) onClose();
      }}
      className="admin-modal fixed inset-0 m-auto h-[min(90vh,60rem)] w-[min(94vw,56rem)] overflow-hidden rounded-lg border border-border bg-surface p-0 text-fg shadow-none backdrop:bg-[oklch(22%_0.06_250/0.32)]"
      aria-label={title}
      data-testid="pdf-preview-modal"
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg"
              data-testid="pdf-print-button"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              data-testid="pdf-download-button"
            >
              Baixar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-bg"
              data-testid="pdf-close-button"
              aria-label="Fechar"
            >
              Fechar
            </button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          src={url}
          title={title}
          className="min-h-0 flex-1 bg-white"
          data-testid="pdf-preview-frame"
        />
      </div>
    </dialog>
  );
}
