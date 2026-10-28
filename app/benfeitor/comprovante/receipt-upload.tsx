"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const GENERIC_ERROR = "Não foi possível enviar o comprovante. Tente novamente.";

export function ReceiptUpload({ ticket, hasReceipt = false }: { ticket: string; hasReceipt?: boolean }) {
  const [receiptSent, setReceiptSent] = useState(hasReceipt);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (requestRef.current) {
      requestRef.current.onload = null;
      requestRef.current.onerror = null;
      requestRef.current.abort();
    }
  }, []);

  function chooseFile(next: File | null) {
    setFile(next);
    setError("");
    setSuccess("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    if (!file) {
      setError("Escolha uma imagem ou PDF para enviar.");
      return;
    }
    if (file.size === 0 || !ACCEPTED_TYPES.has(file.type)) {
      setError("Escolha uma imagem ou PDF válido.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("O arquivo deve ter no máximo 10 MB.");
      return;
    }

    setError("");
    setSuccess("");
    setProgress(null);
    setUploading(true);
    const form = new FormData();
    form.set("ticket", ticket);
    form.set("file", file);
    const request = new XMLHttpRequest();
    requestRef.current = request;
    request.open("POST", "/api/donor-receipts");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
    };
    request.onload = () => {
      requestRef.current = null;
      setUploading(false);
      setProgress(null);
      if (request.status >= 200 && request.status < 300) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        setReceiptSent(true);
        setSuccess("Comprovante recebido para este mês. A confirmação do pagamento depende da conferência bancária.");
      } else if (request.status === 403) {
        setError("Este link não está mais disponível. Solicite um novo link à Arca.");
      } else if (request.status === 413) {
        setError("O arquivo deve ter no máximo 10 MB.");
      } else if (request.status === 400) {
        setError("Escolha uma imagem ou PDF válido.");
      } else {
        setError(GENERIC_ERROR);
      }
    };
    request.onerror = () => {
      requestRef.current = null;
      setUploading(false);
      setProgress(null);
      setError(GENERIC_ERROR);
    };
    request.send(form);
  }

  return (
    <form className="mt-7 border-t border-border pt-6" onSubmit={submit} noValidate>
      <p data-testid="receipt-state" className="mb-4 font-medium text-fg" aria-live="polite">
        {receiptSent ? "Comprovante enviado – aguardando conferência" : "Comprovante pendente"}
      </p>
      <label htmlFor="monthly-receipt" className="block text-sm font-medium text-fg">Comprovante Pix</label>
      <p id="receipt-help" className="mt-1 text-sm leading-6 text-muted">
        Envie o comprovante obrigatório deste pagamento em imagem (JPEG, PNG, WebP ou GIF) ou PDF de até 10 MB. Se enviar outro comprovante para este mês, ele substituirá o anterior.
      </p>
      <input
        ref={inputRef}
        id="monthly-receipt"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        aria-describedby="receipt-help receipt-feedback"
        aria-invalid={Boolean(error)}
        disabled={uploading}
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
        className="mt-4 block w-full rounded-md border border-border bg-surface px-3 py-3 text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-medium file:text-secondary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      />
      <div id="receipt-feedback" className="mt-3 min-h-6 text-sm" aria-live="polite">
        {uploading && (
          <div>
            <p>Enviando comprovante{progress === null ? "…" : `: ${progress}%`}</p>
            <progress aria-label="Progresso do envio" value={progress ?? undefined} max={100} className="mt-2 w-full accent-primary" />
          </div>
        )}
        {error && <p role="alert" className="text-danger">{error}</p>}
        {success && <p role="status" className="text-success">{success}</p>}
      </div>
      <Button type="submit" size="lg" disabled={uploading} className="mt-4 min-h-11 w-full sm:w-auto sm:min-w-48">
        {uploading ? "Enviando…" : "Enviar comprovante"}
      </Button>
    </form>
  );
}
