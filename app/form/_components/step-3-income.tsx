"use client";

import { useId } from "react";
import type { FormData } from "./form-types";
import { parseMoney, formatMoney } from "./form-types";
import { FileUpload } from "./file-upload";
import type { UploadedFile } from "./file-upload";
import { RequiredMark, FieldError, fieldBorder } from "./field-ui";
import { useMemo } from "react";

interface Step3Props {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  errors: Record<string, string>;
}

export function Step3Income({ data, onChange, errors }: Step3Props) {
  const totalRenda = useMemo(
    () =>
      parseMoney(data.renda_pai) +
      parseMoney(data.renda_mae) +
      parseMoney(data.renda_outros),
    [data.renda_pai, data.renda_mae, data.renda_outros]
  );

  return (
    <div data-testid="step-3">
      <div className="rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Renda Familiar
        </h2>
        <p className="mb-6 text-sm text-muted">
          Declaração juramentada de renda mensal do grupo familiar.
        </p>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <MoneyField
            label="Renda do pai (R$)"
            value={data.renda_pai}
            onChange={(v) => onChange({ renda_pai: v })}
            testId="renda-pai"
          />
          <MoneyField
            label="Renda da mãe (R$)"
            value={data.renda_mae}
            onChange={(v) => onChange({ renda_mae: v })}
            testId="renda-mae"
          />
        </div>
        <MoneyField
          label="Renda de outros membros (R$)"
          value={data.renda_outros}
          onChange={(v) => onChange({ renda_outros: v })}
          testId="renda-outros"
        />

        <div className="mt-4 flex justify-between border-t border-border py-2.5 text-sm">
          <span className="text-muted">Total de renda familiar</span>
          <span className="font-semibold tabular-nums" data-testid="total-renda">
            {formatMoney(totalRenda)}
          </span>
        </div>

        <div className="my-6 h-px bg-border" />

        <div className="mb-5">
          <label
            htmlFor="pessoas-domicilio"
            className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg"
          >
            Pessoas no grupo familiar
            <RequiredMark />
          </label>
          <input
            id="pessoas-domicilio"
            type="number"
            min="1"
            aria-invalid={errors.pessoas_domicilio ? true : undefined}
            value={data.pessoas_domicilio}
            onChange={(e) => onChange({ pessoas_domicilio: e.target.value })}
            placeholder="Total de pessoas"
            className={`w-full rounded-md border px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!errors.pessoas_domicilio)}`}
            data-testid="pessoas-domicilio"
          />
          <FieldError error={errors.pessoas_domicilio} />
        </div>

        <div className="my-6 h-px bg-border" />

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Extrato do Imposto de Renda
            <RequiredMark />
          </label>
          <p className="mb-2 text-xs text-muted">
            Para comprovação dos dependentes e renda declarada.
          </p>
          <FileUpload
            label="para enviar o extrato do Imposto de Renda"
            category="extrato_ir"
            files={data.extrato_ir}
            onChange={(f: UploadedFile[]) => onChange({ extrato_ir: f })}
            multiple
            required
            error={errors.extrato_ir}
          />
        </div>
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  const id = useId();

  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
        data-testid={testId}
      />
    </div>
  );
}
