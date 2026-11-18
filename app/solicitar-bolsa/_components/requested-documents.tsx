"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUpload, type UploadedFile } from "@/app/form/_components/file-upload";
import { useServerAction } from "@/components/server-actions";

export interface RequestedDocument {
  id: string;
  label: string;
  motivo: string;
  status: "aberta" | "reenviada" | "resolvida";
  resubmitted_at: string | null;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function RequestItem({ request, onSent }: { request: RequestedDocument; onSent: (id: string, at: string) => void }) {
  const submitRequestedDocument = useServerAction("submitRequestedDocument");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingId = `request-${request.id}-label`;
  const reasonId = `request-${request.id}-reason`;

  const uploading = files.some((file) => file.uploading);
  const ready = files.filter((file) => file.path && !file.uploading && !file.error);

  async function send() {
    if (ready.length === 0) {
      setError(uploading ? "Aguarde o envio do arquivo terminar." : "Anexe o documento antes de enviar.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await submitRequestedDocument(request.id, ready.map((file) => file.path));
      if (result.success) onSent(request.id, new Date().toISOString());
      else setError(result.error);
    } catch {
      setError("Erro de conexão ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (request.status !== "aberta") {
    return (
      <li className="rounded-md border border-border bg-bg px-4 py-3" data-testid={`requested-${request.id}`}>
        <p className="font-medium text-fg">{request.label}</p>
        <p className="mt-1 text-sm text-muted">
          {request.status === "resolvida"
            ? "Documento recebido e conferido pela equipe."
            : `Documento reenviado${request.resubmitted_at ? ` em ${formatDateTime(request.resubmitted_at)}` : ""}. A equipe vai conferir.`}
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-gold/60 bg-gold/5 px-4 py-4" data-testid={`requested-${request.id}`}>
      <p id={headingId} className="font-medium text-fg">
        {request.label}
      </p>
      <p id={reasonId} className="mt-1 text-sm text-fg">
        <span className="text-muted">Motivo: </span>
        {request.motivo}
      </p>
      <div className="mt-3">
        <FileUpload
          label="o documento corrigido (imagem ou PDF, até 10 MB)"
          labelId={headingId}
          descriptionId={reasonId}
          category="pendencia"
          multiple
          files={files}
          onChange={(next) => {
            setFiles(next);
            setError(null);
          }}
          error={error ?? undefined}
        />
      </div>
      <button
        type="button"
        onClick={() => void send()}
        disabled={sending}
        className="mt-3 w-full rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
        data-testid={`send-requested-${request.id}`}
      >
        {sending ? "Enviando…" : "Enviar documento"}
      </button>
    </li>
  );
}

/** Documentos que a equipe pediu de novo, com o reenvio de cada um. */
export function RequestedDocuments({ initialRequests }: { initialRequests: RequestedDocument[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  if (requests.length === 0) return null;
  const open = requests.filter((request) => request.status === "aberta").length;

  return (
    <section
      aria-labelledby="requested-documents-title"
      className="mt-6 rounded-xl border border-border bg-surface p-7 max-sm:p-5"
      data-testid="requested-documents"
    >
      <h2 id="requested-documents-title" className="font-display text-[20px] font-semibold text-fg">
        Documentos pendentes
      </h2>
      <p className="mt-1 text-[15px] text-muted">
        {open > 0
          ? "A equipe pediu que você reenvie os documentos abaixo. Os demais dados da solicitação continuam como foram enviados."
          : "Todos os documentos pedidos foram reenviados."}
      </p>
      <ul className="mt-5 space-y-3">
        {requests.map((request) => (
          <RequestItem
            key={request.id}
            request={request}
            onSent={(id, at) => {
              setRequests((current) =>
                current.map((item) => (item.id === id ? { ...item, status: "reenviada", resubmitted_at: at } : item))
              );
              // Atualiza o selo da solicitação, calculado no servidor.
              router.refresh();
            }}
          />
        ))}
      </ul>
    </section>
  );
}
