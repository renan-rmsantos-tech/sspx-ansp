"use client";

import { useState, useCallback } from "react";
import {
  deleteDonorPledge,
  exportDonorPledge,
  getDocumentUrl,
} from "../_actions/admin-actions";
import { PdfPreviewModal } from "./pdf-preview-modal";
import { prioradoCapelaLabel } from "@/lib/data/priorados-capelas";
import { formatDonorDate } from "@/lib/donor-date";

export interface DonorPledge {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string | null;
  endereco?: string | null;
  cep?: string | null;
  priorado_capela?: string | null;
  frequencia: "unica" | "mensal";
  duracao?: "um_ano" | "indeterminado" | null;
  valor: number;
  data_pagamento?: string | null;
  lembrete_canal?: "whatsapp" | "email" | null;
  recibo_path?: string | null;
  recibo_nome?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export const FREQUENCIA_LABELS: Record<DonorPledge["frequencia"], string> = {
  unica: "Única",
  mensal: "Mensal",
};

const DURACAO_LABELS: Record<NonNullable<DonorPledge["duracao"]>, string> = {
  um_ano: "Por um ano",
  indeterminado: "Indeterminado",
};

const CANAL_LABELS: Record<NonNullable<DonorPledge["lembrete_canal"]>, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
};

const FREQUENCIA_COLORS: Record<DonorPledge["frequencia"], string> = {
  mensal: "bg-success/15 text-success",
  unica: "bg-accent/15 text-accent",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Formata 'YYYY-MM-DD' como 'DD/MM/YYYY' sem depender de fuso horário.
function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

interface DonorCardProps {
  donor: DonorPledge;
  onDelete: (id: string) => void;
}

export function DonorCard({ donor, onDelete }: DonorCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reciboLoading, setReciboLoading] = useState(false);
  const [reciboError, setReciboError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    { pdfBase64: string; filename: string } | null
  >(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    const result = await exportDonorPledge(donor.id);
    if ("pdfBase64" in result) {
      setPreview({ pdfBase64: result.pdfBase64, filename: result.filename });
    } else {
      setExportError(result.error);
    }
    setExporting(false);
  }, [donor.id]);

  const handleOpenRecibo = useCallback(async () => {
    if (!donor.recibo_path) return;
    setReciboLoading(true);
    setReciboError(null);
    const result = await getDocumentUrl(donor.recibo_path);
    setReciboLoading(false);
    if ("url" in result) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setReciboError(result.error);
    }
  }, [donor.recibo_path]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteDonorPledge(donor.id);
    setDeleting(false);
    if (result.success) {
      onDelete(donor.id);
    } else {
      setError(result.error ?? "Erro ao excluir.");
      setConfirming(false);
    }
  }, [donor.id, onDelete]);

  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      data-testid={`donor-card-${donor.id}`}
    >
      {preview && (
        <PdfPreviewModal
          pdfBase64={preview.pdfBase64}
          filename={preview.filename}
          title="Cadastro de Benfeitor"
          onClose={() => setPreview(null)}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-fg">{donor.nome}</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${FREQUENCIA_COLORS[donor.frequencia]}`}
              data-testid="frequencia-badge"
            >
              {FREQUENCIA_LABELS[donor.frequencia]}
              {donor.frequencia === "mensal" && donor.duracao
                ? ` · ${DURACAO_LABELS[donor.duracao]}`
                : ""}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <a
              href={`mailto:${donor.email}`}
              className="hover:text-accent hover:underline"
            >
              {donor.email}
            </a>
            <span>CPF: {donor.cpf}</span>
            {donor.telefone && <span>{donor.telefone}</span>}
            {donor.endereco && <span>{donor.endereco}</span>}
            {donor.cep && <span>CEP: {donor.cep}</span>}
            {donor.priorado_capela && (
              <span>
                Priorado/Capela: {prioradoCapelaLabel(donor.priorado_capela)}
              </span>
            )}
            <span>Cadastro: {formatDonorDate(donor.created_at)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="text-muted">Valor: </span>
              <span className="font-semibold text-fg">
                {currency.format(donor.valor)}
                {donor.frequencia === "mensal" ? "/mês" : ""}
              </span>
            </span>
            {donor.data_pagamento && (
              <span>
                <span className="text-muted">Pagamento: </span>
                <span className="text-fg">{formatDateBR(donor.data_pagamento)}</span>
              </span>
            )}
            {donor.lembrete_canal && (
              <span>
                <span className="text-muted">Lembrete: </span>
                <span className="text-fg">{CANAL_LABELS[donor.lembrete_canal]}</span>
              </span>
            )}
            {donor.recibo_nome && (
              <span>
                <span className="text-muted">Recibo: </span>
                <span className="text-fg">{donor.recibo_nome}</span>
              </span>
            )}
          </div>

          {donor.observacoes && (
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-fg">Observações: </span>
              {donor.observacoes}
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-danger" data-testid="donor-delete-error">
              {error}
            </p>
          )}
          {exportError && (
            <p className="mt-2 text-sm text-danger" data-testid="donor-export-error">
              {exportError}
            </p>
          )}
          {reciboError && (
            <p className="mt-2 text-sm text-danger" data-testid="donor-recibo-error">
              {reciboError}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {donor.recibo_path && (
            <button
              type="button"
              onClick={handleOpenRecibo}
              disabled={reciboLoading}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
              data-testid="donor-recibo-button"
            >
              {reciboLoading ? "Abrindo..." : "Ver recibo"}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
            data-testid="donor-export-button"
          >
            {exporting ? "Gerando..." : "Visualizar e Imprimir"}
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-danger bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
                data-testid="donor-delete-confirm"
              >
                {deleting ? "Excluindo..." : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-bg disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-danger hover:bg-bg"
              data-testid="donor-delete-button"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
