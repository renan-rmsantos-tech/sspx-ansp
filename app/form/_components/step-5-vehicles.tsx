"use client";

import type { FormData, Vehicle, Benefactor } from "./form-types";
import { RequiredMark, FieldError, fieldBorder } from "./field-ui";

interface Step5Props {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  errors: Record<string, string>;
}

export function Step5Vehicles({ data, onChange, errors }: Step5Props) {
  const addVehicle = () => {
    onChange({
      veiculos: [...data.veiculos, { marca: "", modelo: "", ano: "" }],
    });
  };

  const removeVehicle = (index: number) => {
    onChange({ veiculos: data.veiculos.filter((_, i) => i !== index) });
  };

  const updateVehicle = (
    index: number,
    field: keyof Vehicle,
    value: string
  ) => {
    const updated = [...data.veiculos];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ veiculos: updated });
  };

  const updateBenefactor = (
    index: number,
    field: keyof Benefactor,
    value: string
  ) => {
    const updated = [...data.indicacao_benfeitores];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ indicacao_benfeitores: updated });
  };

  return (
    <div data-testid="step-5" className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Veículos da Família
        </h2>
        <p className="mb-6 text-sm text-muted">
          Informe os veículos de propriedade da família, se houver. Ao adicionar
          um veículo, marca, modelo e ano são obrigatórios.
        </p>

        {data.veiculos.length > 0 && (
          <div className="mb-2 grid grid-cols-[1fr_1fr_100px_40px] gap-2.5 text-[11px] font-medium uppercase tracking-widest text-muted max-sm:hidden">
            <span>
              Marca
              <RequiredMark />
            </span>
            <span>
              Modelo
              <RequiredMark />
            </span>
            <span>
              Ano
              <RequiredMark />
            </span>
            <span />
          </div>
        )}

        <div data-testid="veiculos-list">
          {data.veiculos.map((v, i) => {
            const marcaError = errors[`veiculo_${i}_marca`];
            const modeloError = errors[`veiculo_${i}_modelo`];
            const anoError = errors[`veiculo_${i}_ano`];
            return (
              <div key={i} className="mb-3">
                <div className="grid grid-cols-[1fr_1fr_100px_40px] items-start gap-2.5 max-sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Marca"
                    aria-label={`Marca do veículo ${i + 1}`}
                    aria-invalid={marcaError ? true : undefined}
                    value={v.marca}
                    onChange={(e) => updateVehicle(i, "marca", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!marcaError)}`}
                    data-testid={`veiculo-marca-${i}`}
                  />
                  <input
                    type="text"
                    placeholder="Modelo"
                    aria-label={`Modelo do veículo ${i + 1}`}
                    aria-invalid={modeloError ? true : undefined}
                    value={v.modelo}
                    onChange={(e) => updateVehicle(i, "modelo", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!modeloError)}`}
                    data-testid={`veiculo-modelo-${i}`}
                  />
                  <input
                    type="text"
                    placeholder="Ano"
                    aria-label={`Ano do veículo ${i + 1}`}
                    aria-invalid={anoError ? true : undefined}
                    value={v.ano}
                    onChange={(e) => updateVehicle(i, "ano", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!anoError)}`}
                    data-testid={`veiculo-ano-${i}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeVehicle(i)}
                    className="grid h-[42px] w-10 place-items-center rounded-md border border-border bg-surface text-lg text-muted transition-colors hover:border-danger hover:text-danger max-sm:col-span-2 max-sm:h-auto max-sm:w-full max-sm:py-2 max-sm:text-[13px]"
                    title="Remover"
                    data-testid="remove-vehicle"
                  >
                    &times;
                  </button>
                </div>
                <FieldError error={marcaError || modeloError || anoError} />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addVehicle}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-4 py-2 text-[13px] font-medium tracking-wide text-gold transition-colors hover:bg-gold/20"
          data-testid="add-vehicle"
        >
          + Adicionar veículo
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Indicação de Benfeitores
          <RequiredMark />
        </h2>
        <p className="mb-6 text-sm text-muted">
          Indique 10 pessoas que possam ser contatadas como possíveis benfeitores
          da escola. Todas as 10 indicações são obrigatórias (nome e e-mail).
        </p>

        <div className="mb-2 grid grid-cols-[28px_1fr_1fr] gap-2.5 text-[11px] font-medium uppercase tracking-widest text-muted max-sm:grid-cols-[28px_1fr]">
          <span>#</span>
          <span>
            Nome completo
            <RequiredMark />
          </span>
          <span className="max-sm:hidden">
            E-mail
            <RequiredMark />
          </span>
        </div>

        <div data-testid="benfeitores-list">
          {data.indicacao_benfeitores.map((b, i) => {
            const nomeError = errors[`benfeitor_${i}_nome`];
            const emailError = errors[`benfeitor_${i}_email`];
            return (
              <div
                key={i}
                className="mb-2 grid grid-cols-[28px_1fr_1fr] items-start gap-2.5 max-sm:grid-cols-[28px_1fr]"
              >
                <span className="mt-2.5 text-center text-[13px] font-medium text-muted">
                  {i + 1}
                </span>
                <div>
                  <input
                    type="text"
                    placeholder="Nome"
                    aria-label={`Nome do benfeitor indicado ${i + 1}`}
                    aria-invalid={nomeError ? true : undefined}
                    value={b.nome}
                    onChange={(e) => updateBenefactor(i, "nome", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!nomeError)}`}
                    data-testid={`benfeitor-nome-${i}`}
                  />
                  <FieldError error={nomeError} />
                </div>
                <div className="max-sm:col-start-2">
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    aria-label={`E-mail do benfeitor indicado ${i + 1}`}
                    aria-invalid={emailError ? true : undefined}
                    value={b.email}
                    onChange={(e) =>
                      updateBenefactor(i, "email", e.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!emailError)}`}
                    data-testid={`benfeitor-email-${i}`}
                  />
                  <FieldError error={emailError} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
