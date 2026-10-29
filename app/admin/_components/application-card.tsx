"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDown, FileSignature, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationDetail } from "./application-detail";
import { DecisionActions } from "./decision-actions";
import { PdfPreviewModal } from "./pdf-preview-modal";
import { IssuedDocuments } from "./issued-documents";
import { ApplicationObservations } from "./application-observations";
import { ActionBar } from "./action-bar";
import { DataGrid, DataItem } from "./data-grid";
import { Notice } from "./notice";
import { RecordRow } from "./record-row";
import { STATUS_LABELS, STATUS_TONES, type ApplicationStatus } from "./status-labels";
import { StatusPill } from "./status-pill";
import {
  getApplicationDetail,
  exportDecision,
  exportContract,
  exportApplication,
} from "../_actions/admin-actions";

export interface ApplicationSummary {
  id: string;
  status: ApplicationStatus;
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

export type DecisionHandler = (
  id: string,
  status: ApplicationStatus,
  desconto_concedido?: number | null,
  motivo?: string | null
) => void;

interface ApplicationCardProps {
  application: ApplicationSummary;
  onDecision: DecisionHandler;
  defaultOpen?: boolean;
}

type Preview = { pdfBase64: string; filename: string; title: string };
type PdfResult = { pdfBase64: string; filename: string } | { error: string };

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (Number(value) || 0), 0);
}

export function ApplicationCard({ application, onDecision, defaultOpen = false }: ApplicationCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [pending, setPending] = useState<"data" | "decision" | "contract" | null>(null);
  const [errors, setErrors] = useState<{ data?: string; decision?: string; contract?: string }>({});
  const [preview, setPreview] = useState<Preview | null>(null);

  // O detalhe é buscado na primeira abertura (inclusive quando a linha já vem
  // aberta por padrão); o estado "carregando" é derivado, sem setState síncrono.
  useEffect(() => {
    if (!open || detail || detailError) return;
    let cancelled = false;
    getApplicationDetail(application.id)
      .then((result) => {
        if (cancelled) return;
        if (result.data) setDetail(result.data as Record<string, unknown>);
        else setDetailError(true);
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, detail, detailError, application.id]);

  const runExport = useCallback(
    async (kind: "data" | "decision" | "contract", action: (id: string) => Promise<PdfResult>, title: string) => {
      setPending(kind);
      setErrors((prev) => ({ ...prev, [kind]: undefined }));
      const result = await action(application.id);
      if ("pdfBase64" in result) {
        setPreview({ pdfBase64: result.pdfBase64, filename: result.filename, title });
      } else {
        setErrors((prev) => ({ ...prev, [kind]: result.error }));
      }
      setPending(null);
    },
    [application.id]
  );

  const decided = application.status !== "pendente";
  const approved = application.status === "aprovada";
  const loading = open && !detail && !detailError;

  const decisionPanel = decided ? (
    <div className="space-y-4" data-testid="decision-info">
      <Notice
        tone={approved ? "success" : "danger"}
        role="status"
        title={approved ? `Aprovada com ${application.desconto_concedido ?? 0}% de desconto` : "Rejeitada"}
      >
        Registrada em {formatDate(application.data_decisao)}. {application.motivo || "Sem motivo registrado."}
      </Notice>
      <DataGrid cols={3}>
        <DataItem label="Desconto solicitado" value={`${application.desconto_solicitado}%`} />
        <DataItem
          label="Desconto concedido"
          value={application.desconto_concedido != null ? `${application.desconto_concedido}%` : "—"}
        />
        <DataItem label="Data da decisão" value={formatDate(application.data_decisao)} />
      </DataGrid>
      <IssuedDocuments applicationId={application.id} />
    </div>
  ) : (
    <DecisionActions
      applicationId={application.id}
      requestedDiscount={application.desconto_solicitado}
      familyIncome={detail ? sum([detail.renda_pai as number, detail.renda_mae as number, detail.renda_outros as number]) : undefined}
      monthlyTuition={sum(application.students.map((student) => student.mensalidade))}
      onDecision={onDecision}
    />
  );

  return (
    <RecordRow
      data-testid={`application-card-${application.id}`}
      toggleTestId="card-toggle"
      detailTestId="card-detail"
      open={open}
      onOpenChange={setOpen}
      title={`${application.pai_nome} e ${application.mae_nome}`}
      meta={
        <>
          <span>{application.escola}</span>
          <span data-testid="student-count">
            {application.students.length} {application.students.length === 1 ? "aluno" : "alunos"}
          </span>
          <span>Enviada em {formatDate(application.data_envio)}</span>
        </>
      }
      status={
        <StatusPill tone={STATUS_TONES[application.status]} data-testid="status-badge">
          {STATUS_LABELS[application.status]}
        </StatusPill>
      }
    >
      {preview && (
        <PdfPreviewModal
          pdfBase64={preview.pdfBase64}
          filename={preview.filename}
          title={preview.title}
          onClose={() => setPreview(null)}
        />
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-muted">Carregando…</p>
      ) : detail ? (
        <ApplicationDetail
          detail={detail}
          status={application.status}
          decisionPanel={decisionPanel}
          afterResumo={<ApplicationObservations applicationId={application.id} />}
        />
      ) : (
        <Notice tone="danger">Erro ao carregar detalhes.</Notice>
      )}

      {(errors.data || errors.decision || errors.contract) && (
        <div className="mt-4 space-y-2">
          {errors.data && (
            <Notice tone="danger" data-testid="export-data-error">
              {errors.data}
            </Notice>
          )}
          {errors.decision && (
            <Notice tone="danger" data-testid="export-error">
              {errors.decision}
            </Notice>
          )}
          {errors.contract && (
            <Notice tone="danger" data-testid="contract-error">
              {errors.contract}
            </Notice>
          )}
        </div>
      )}

      <ActionBar note="Os PDFs são gerados com o cabeçalho e os modelos configurados.">
        <Button
          variant="outline"
          size="lg"
          disabled={pending === "data"}
          onClick={() => void runExport("data", exportApplication, "Dados da Solicitação")}
          data-testid="export-data-button"
        >
          <Printer aria-hidden="true" /> {pending === "data" ? "Gerando…" : "Imprimir dados da solicitação"}
        </Button>
        {decided && (
          <Button
            variant="outline"
            size="lg"
            disabled={pending === "decision"}
            onClick={() => void runExport("decision", exportDecision, "Decisão")}
            data-testid="export-button"
          >
            <FileDown aria-hidden="true" /> {pending === "decision" ? "Gerando…" : "Carta de decisão"}
          </Button>
        )}
        {approved && (
          <Button
            variant="outline"
            size="lg"
            disabled={pending === "contract"}
            onClick={() => void runExport("contract", exportContract, "Contrato")}
            data-testid="contract-button"
          >
            <FileSignature aria-hidden="true" /> {pending === "contract" ? "Gerando…" : "Contrato"}
          </Button>
        )}
      </ActionBar>
    </RecordRow>
  );
}
