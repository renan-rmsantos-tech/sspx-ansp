"use client";

import { useState, useCallback, type FormEvent } from "react";
import { createSchoolYear } from "../_actions/admin-actions";
import type { SchoolYear } from "./school-year-list";

interface SchoolYearFormProps {
  onCreated: (year: SchoolYear) => void;
}

export function SchoolYearForm({ onCreated }: SchoolYearFormProps) {
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!nome.trim()) {
        setError("Nome é obrigatório.");
        return;
      }

      if (!dataInicio || !dataFim) {
        setError("Datas de início e fim são obrigatórias.");
        return;
      }

      if (new Date(dataFim) <= new Date(dataInicio)) {
        setError("Data de fim deve ser posterior à data de início.");
        return;
      }

      setLoading(true);
      const result = await createSchoolYear({
        nome: nome.trim(),
        data_inicio: dataInicio,
        data_fim: dataFim,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "Erro ao criar ano letivo.");
        setLoading(false);
        return;
      }

      // Usa a linha persistida: um ID inventado no cliente quebraria
      // ativar/excluir até a página ser recarregada.
      onCreated(result.data);

      setNome("");
      setDataInicio("");
      setDataFim("");
      setLoading(false);
    },
    [nome, dataInicio, dataFim, onCreated]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-4"
      data-testid="school-year-form"
    >
      <h3 className="text-sm font-semibold text-fg">
        Novo Ano Letivo
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="sy-nome"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Nome
          </label>
          <input
            id="sy-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: 2026"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            data-testid="input-nome"
          />
        </div>
        <div>
          <label
            htmlFor="sy-inicio"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Data de Início
          </label>
          <input
            id="sy-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            data-testid="input-inicio"
          />
        </div>
        <div>
          <label
            htmlFor="sy-fim"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Data de Fim
          </label>
          <input
            id="sy-fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            data-testid="input-fim"
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-danger" data-testid="form-error">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          data-testid="submit-button"
        >
          {loading ? "Criando..." : "Criar Ano Letivo"}
        </button>
      </div>
    </form>
  );
}
