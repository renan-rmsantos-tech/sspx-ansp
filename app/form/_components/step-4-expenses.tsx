"use client";

import type { FormData } from "./form-types";
import { parseMoney, formatMoney } from "./form-types";
import { FileUpload } from "./file-upload";
import type { UploadedFile } from "./file-upload";
import { RequiredMark } from "./field-ui";
import { useMemo } from "react";
import {
  SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE,
  SCHOLARSHIP_UPLOADS_ENABLED,
} from "@/lib/form/scholarship-uploads";

interface Step4Props {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  errors: Record<string, string>;
}

const EXPENSE_FIELDS = [
  { key: "despesa_aluguel" as const, label: "Aluguel (R$)", testId: "desp-aluguel" },
  { key: "despesa_servicos" as const, label: "Serviços (luz, água, gás, taxas) (R$)", testId: "desp-servicos" },
  { key: "despesa_tv" as const, label: "TV / Streaming (R$)", testId: "desp-tv" },
  { key: "despesa_celular_plano" as const, label: "Plano de celular (R$)", testId: "desp-celular" },
  { key: "despesa_celular_parcelas" as const, label: "Parcelas de aparelhos celular (R$)", testId: "desp-parcelas" },
  { key: "despesa_internet" as const, label: "Plano de internet (R$)", testId: "desp-internet" },
] as const;

export function Step4Expenses({ data, onChange, errors }: Step4Props) {
  const totalDespesas = useMemo(
    () =>
      EXPENSE_FIELDS.reduce(
        (sum, f) => sum + parseMoney(data[f.key]),
        0
      ),
    [data]
  );

  return (
    <div data-testid="step-4">
      <div className="rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Despesas Mensais
        </h2>
        <p className="mb-6 text-sm text-muted">
          Informe as despesas mensais do grupo familiar.
        </p>

        {EXPENSE_FIELDS.map((f) => (
          <div key={f.key} className="mb-5">
            <label
              htmlFor={f.testId}
              className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg"
            >
              {f.label}
            </label>
            <input
              id={f.testId}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={data[f.key]}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              data-testid={f.testId}
            />
          </div>
        ))}

        <div className="mt-4 flex justify-between border-t border-border py-2.5 text-sm">
          <span className="text-muted">Total de despesas</span>
          <span className="font-semibold tabular-nums" data-testid="total-despesas">
            {formatMoney(totalDespesas)}
          </span>
        </div>

        <div className="my-6 h-px bg-border" />

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Extrato bancário dos últimos 3 meses
            {SCHOLARSHIP_UPLOADS_ENABLED && <RequiredMark />}
          </label>
          <p className="mb-2 text-xs text-muted">
            Envie o extrato de todas as contas bancárias da família (pode enviar
            mais de um arquivo). Os valores de despesa acima são opcionais — o
            extrato é o que comprova as despesas.
          </p>
          <FileUpload
            label="para enviar os extratos bancários (múltiplos arquivos)"
            category="extrato_bancario"
            files={data.extratos_bancarios}
            onChange={(f: UploadedFile[]) =>
              onChange({ extratos_bancarios: f })
            }
            multiple
            required={SCHOLARSHIP_UPLOADS_ENABLED}
            disabled={!SCHOLARSHIP_UPLOADS_ENABLED}
            disabledMessage={SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE}
            error={errors.extratos_bancarios}
          />
        </div>
      </div>
    </div>
  );
}
