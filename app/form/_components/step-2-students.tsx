"use client";

import type { FormData, Student } from "./form-types";
import { SERIES_OPTIONS, parseMoney, formatMoney } from "./form-types";
import { FileUpload } from "./file-upload";
import type { UploadedFile } from "./file-upload";
import { RequiredMark, FieldError, fieldBorder } from "./field-ui";
import { useMemo } from "react";
import {
  SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE,
  SCHOLARSHIP_UPLOADS_ENABLED,
} from "@/lib/form/scholarship-uploads";

interface Step2Props {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  errors: Record<string, string>;
}

export function Step2Students({ data, onChange, errors }: Step2Props) {
  const totalSem = useMemo(
    () => data.alunos.reduce((sum, a) => sum + parseMoney(a.mensalidade), 0),
    [data.alunos]
  );

  const pct = parseMoney(data.desconto_solicitado);
  const totalCom = totalSem * (1 - Math.min(pct, 100) / 100);

  const addStudent = () => {
    onChange({
      alunos: [
        ...data.alunos,
        {
          nome: "",
          cpf: "",
          serie: "",
          mensalidade: "",
          docRg: [],
          docCertidao: [],
        },
      ],
    });
  };

  const removeStudent = (index: number) => {
    if (data.alunos.length <= 1) return;
    onChange({ alunos: data.alunos.filter((_, i) => i !== index) });
  };

  const updateStudent = (
    index: number,
    field: keyof Student,
    value: string | UploadedFile[]
  ) => {
    const updated = [...data.alunos];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ alunos: updated });
  };

  return (
    <div data-testid="step-2">
      <div className="rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Dados dos Alunos
        </h2>
        <p className="mb-6 text-sm text-muted">
          Informe os alunos para os quais solicita a bolsa.
        </p>

        <div data-testid="alunos-list">
          {data.alunos.map((aluno, i) => (
            <div
              key={i}
              className="relative mb-4 rounded-lg border border-border bg-surface p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium tracking-wide text-muted">
                  Aluno {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeStudent(i)}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-lg text-muted transition-colors hover:border-danger hover:text-danger"
                  title="Remover aluno"
                  data-testid="remove-student"
                >
                  &times;
                </button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
                <div className="col-span-full max-sm:col-span-1">
                  <label
                    htmlFor={`aluno-nome-${i}`}
                    className="mb-1 block text-xs font-medium tracking-wide text-muted"
                  >
                    Nome completo do aluno<RequiredMark />
                  </label>
                  <input
                    id={`aluno-nome-${i}`}
                    type="text"
                    placeholder="Nome completo"
                    aria-invalid={errors[`aluno_${i}_nome`] ? true : undefined}
                    value={aluno.nome}
                    onChange={(e) =>
                      updateStudent(i, "nome", e.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!errors[`aluno_${i}_nome`])}`}
                    data-testid={`aluno-nome-${i}`}
                  />
                  <FieldError error={errors[`aluno_${i}_nome`]} />
                </div>
                <div>
                  <label
                    htmlFor={`aluno-cpf-${i}`}
                    className="mb-1 block text-xs font-medium tracking-wide text-muted"
                  >
                    CPF do aluno<RequiredMark />
                  </label>
                  <input
                    id={`aluno-cpf-${i}`}
                    type="text"
                    placeholder="000.000.000-00"
                    aria-invalid={errors[`aluno_${i}_cpf`] ? true : undefined}
                    value={aluno.cpf}
                    onChange={(e) =>
                      updateStudent(i, "cpf", e.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!errors[`aluno_${i}_cpf`])}`}
                    data-testid={`aluno-cpf-${i}`}
                  />
                  <FieldError error={errors[`aluno_${i}_cpf`]} />
                </div>
                <div>
                  <label
                    htmlFor={`aluno-serie-${i}`}
                    className="mb-1 block text-xs font-medium tracking-wide text-muted"
                  >
                    Série<RequiredMark />
                  </label>
                  <select
                    id={`aluno-serie-${i}`}
                    aria-invalid={errors[`aluno_${i}_serie`] ? true : undefined}
                    value={aluno.serie}
                    onChange={(e) =>
                      updateStudent(i, "serie", e.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!errors[`aluno_${i}_serie`])}`}
                    data-testid={`aluno-serie-${i}`}
                  >
                    <option value="">Selecione</option>
                    {SERIES_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <FieldError error={errors[`aluno_${i}_serie`]} />
                </div>
                <div>
                  <label
                    htmlFor={`aluno-mensalidade-${i}`}
                    className="mb-1 block text-xs font-medium tracking-wide text-muted"
                  >
                    Mensalidade (R$)<RequiredMark />
                  </label>
                  <input
                    id={`aluno-mensalidade-${i}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-invalid={errors[`aluno_${i}_mensalidade`] ? true : undefined}
                    value={aluno.mensalidade}
                    onChange={(e) =>
                      updateStudent(i, "mensalidade", e.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!errors[`aluno_${i}_mensalidade`])}`}
                    data-testid={`aluno-mensalidade-${i}`}
                  />
                  <FieldError error={errors[`aluno_${i}_mensalidade`]} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
                <div>
                  <label className="mb-1 block text-xs font-medium tracking-wide text-muted">
                    RG ou CPF do aluno
                    {SCHOLARSHIP_UPLOADS_ENABLED && <RequiredMark />}
                  </label>
                  <FileUpload
                    label="RG ou CPF do aluno"
                    category={`rg_aluno_${i}`}
                    files={aluno.docRg}
                    onChange={(f) => updateStudent(i, "docRg", f)}
                    required={SCHOLARSHIP_UPLOADS_ENABLED}
                    disabled={!SCHOLARSHIP_UPLOADS_ENABLED}
                    disabledMessage={SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE}
                    error={errors[`aluno_${i}_docRg`]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium tracking-wide text-muted">
                    Certidão de Nascimento
                    {SCHOLARSHIP_UPLOADS_ENABLED && <RequiredMark />}
                  </label>
                  <FileUpload
                    label="Certidão de Nascimento"
                    category={`certidao_nascimento_${i}`}
                    files={aluno.docCertidao}
                    onChange={(f) => updateStudent(i, "docCertidao", f)}
                    required={SCHOLARSHIP_UPLOADS_ENABLED}
                    disabled={!SCHOLARSHIP_UPLOADS_ENABLED}
                    disabledMessage={SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE}
                    error={errors[`aluno_${i}_docCertidao`]}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addStudent}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-4 py-2 text-[13px] font-medium tracking-wide text-gold transition-colors hover:bg-gold/20"
          data-testid="add-student"
        >
          + Adicionar aluno
        </button>

        <div className="mt-6">
          <div className="flex justify-between border-t border-border py-2.5 text-sm">
            <span className="text-muted">Total sem desconto</span>
            <span className="font-semibold tabular-nums" data-testid="total-sem">
              {formatMoney(totalSem)}
            </span>
          </div>
          <div className="my-4 flex flex-wrap items-center gap-2.5">
            <label htmlFor="desconto-pct" className="text-[15px] text-muted">
              Desconto solicitado:<RequiredMark />
            </label>
            <input
              id="desconto-pct"
              type="number"
              min="0"
              max="100"
              aria-invalid={errors.desconto_solicitado ? true : undefined}
              value={data.desconto_solicitado}
              onChange={(e) =>
                onChange({ desconto_solicitado: e.target.value })
              }
              placeholder="%"
              className="w-24 rounded-md border border-border bg-bg px-3 py-2.5 text-center text-base font-semibold tabular-nums text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              data-testid="desconto-pct"
            />
            <span className="text-[15px] text-muted">% do total</span>
          </div>
          <FieldError error={errors.desconto_solicitado} />
          <div className="flex justify-between border-t border-border py-2.5 text-sm">
            <span className="text-muted">Total com desconto</span>
            <span className="font-semibold tabular-nums" data-testid="total-com">
              {formatMoney(totalCom)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
