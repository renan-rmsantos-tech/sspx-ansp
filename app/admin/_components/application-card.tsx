"use client";

import { useState, useCallback } from "react";
import { ApplicationDetail } from "./application-detail";
import { DecisionActions } from "./decision-actions";
import { PdfPreviewModal } from "./pdf-preview-modal";
import { IssuedDocuments } from "./issued-documents";
import { ApplicationObservations } from "./application-observations";
import {
  getApplicationDetail,
  exportDecision,
  exportContract,
  exportApplication,
} from "../_actions/admin-actions";

export interface ApplicationSummary {
  id: string;
  status: string;
  escola: string;
  pai_nome: string;
  mae_nome: string;
  data_envio: string;
  desconto_solicitado: number;
  desconto_concedido?: number | null;
  motivo?: string | null;
  data_decisao?: string | null;
  students: Array<{ id: string; nome: string; serie: string; mensalidade: number }>;
}

interface ApplicationCardProps {
  application: ApplicationSummary;
  onDecision: (id: string, status: string, desconto_concedido?: number | null) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-warn/15 text-warn",
  aprovada: "bg-success/15 text-success",
  rejeitada: "bg-danger/15 text-danger",
};

export function ApplicationCard({ application, onDecision }: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    { pdfBase64: string; filename: string; title: string } | null
  >(null);

  const toggleExpand = useCallback(async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      const result = await getApplicationDetail(application.id);
      if (result.data) {
        setDetail({
          ...result.data,
          status: application.status,
        } as Record<string, unknown>);
      }
      setLoadingDetail(false);
    }
    setExpanded((prev) => !prev);
  }, [expanded, detail, application.id, application.status]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    const result = await exportDecision(application.id);
    if ("pdfBase64" in result) {
      setPreview({
        pdfBase64: result.pdfBase64,
        filename: result.filename,
        title: "Decisão",
      });
    } else {
      setExportError(result.error);
    }
    setExporting(false);
  }, [application.id]);

  const handleGenerateContract = useCallback(async () => {
    setGeneratingContract(true);
    setContractError(null);
    const result = await exportContract(application.id);
    if ("pdfBase64" in result) {
      setPreview({
        pdfBase64: result.pdfBase64,
        filename: result.filename,
        title: "Contrato",
      });
    } else {
      setContractError(result.error);
    }
    setGeneratingContract(false);
  }, [application.id]);

  const handleExportData = useCallback(async () => {
    setExportingData(true);
    setDataError(null);
    const result = await exportApplication(application.id);
    if ("pdfBase64" in result) {
      setPreview({
        pdfBase64: result.pdfBase64,
        filename: result.filename,
        title: "Dados da Solicitação",
      });
    } else {
      setDataError(result.error);
    }
    setExportingData(false);
  }, [application.id]);

  const decided = application.status !== "pendente";
  const approved = application.status === "aprovada";

  const headerActions = (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-2"
      data-testid="card-header-actions"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void handleExportData();
        }}
        disabled={exportingData}
        className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
        data-testid="export-data-button"
      >
        {exportingData ? "Gerando..." : "Exportar Dados (PDF)"}
      </button>
      {decided && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleExport();
          }}
          disabled={exporting}
          className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          data-testid="export-button"
        >
          {exporting ? "Exportando..." : "Exportar Decisão"}
        </button>
      )}
      {approved && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleGenerateContract();
          }}
          disabled={generatingContract}
          className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
          data-testid="contract-button"
        >
          {generatingContract ? "Gerando..." : "Gerar Contrato (PDF)"}
        </button>
      )}
    </div>
  );

  const decisionPanel = decided ? (
    <div data-testid="decision-info">
      <div className="space-y-1 text-sm text-muted">
        <p>
          Status:{" "}
          <span
            className={
              application.status === "aprovada" ? "text-success" : "text-danger"
            }
          >
            {STATUS_LABELS[application.status]}
          </span>
        </p>
        {application.desconto_concedido != null && (
          <p>Desconto concedido: {application.desconto_concedido}%</p>
        )}
        {application.motivo && <p>Motivo: {application.motivo}</p>}
        {application.data_decisao && (
          <p>
            Data:{" "}
            {new Date(application.data_decisao).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  ) : (
    <DecisionActions
      applicationId={application.id}
      requestedDiscount={application.desconto_solicitado}
      onDecision={onDecision}
      embedded
    />
  );

  return (
    <div
      className="rounded-lg border border-border bg-surface"
      data-testid={`application-card-${application.id}`}
    >
      {preview && (
        <PdfPreviewModal
          pdfBase64={preview.pdfBase64}
          filename={preview.filename}
          title={preview.title}
          onClose={() => setPreview(null)}
        />
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={toggleExpand}
            className="min-w-0 flex-1 text-left hover:bg-bg/50"
            aria-expanded={expanded}
            data-testid="card-toggle"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-fg">
                {application.pai_nome} &amp; {application.mae_nome}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[application.status] ?? ""}`}
                data-testid="status-badge"
              >
                {STATUS_LABELS[application.status] ?? application.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>{application.escola}</span>
              <span>
                {new Date(application.data_envio).toLocaleDateString("pt-BR")}
              </span>
              <span data-testid="student-count">
                {application.students.length}{" "}
                {application.students.length === 1 ? "aluno" : "alunos"}
              </span>
              <span>
                Desconto:{" "}
                {application.desconto_concedido != null
                  ? application.desconto_concedido
                  : application.desconto_solicitado}
                %
              </span>
            </div>
          </button>

          {headerActions}

          <button
            type="button"
            onClick={toggleExpand}
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted hover:bg-bg hover:text-fg"
            aria-label={expanded ? "Recolher solicitação" : "Expandir solicitação"}
            data-testid="card-expand-chevron"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {(exportError || contractError || dataError) && (
          <div className="mt-2 flex flex-col gap-1">
            {dataError && (
              <p className="text-sm text-danger" data-testid="export-data-error">
                {dataError}
              </p>
            )}
            {exportError && (
              <p className="text-sm text-danger" data-testid="export-error">
                {exportError}
              </p>
            )}
            {contractError && (
              <p className="text-sm text-danger" data-testid="contract-error">
                {contractError}
              </p>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3" data-testid="card-detail">
          {loadingDetail ? (
            <p className="py-4 text-center text-sm text-muted">Carregando...</p>
          ) : detail ? (
            <><ApplicationDetail detail={detail} decisionPanel={decisionPanel} /><IssuedDocuments applicationId={application.id} /><ApplicationObservations applicationId={application.id} /></>
          ) : (
            <p className="py-4 text-center text-sm text-danger">
              Erro ao carregar detalhes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
