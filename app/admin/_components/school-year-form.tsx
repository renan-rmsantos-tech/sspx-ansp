"use client";

import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSchoolYear } from "../_actions/admin-actions";
import { Field } from "./field";
import { Notice } from "./notice";
import type { SchoolYear } from "./school-year-list";

interface SchoolYearFormProps {
  onCreated: (year: SchoolYear) => void;
  onCancel?: () => void;
}

const INPUT_CLASS = "h-10 bg-surface";

export function SchoolYearForm({ onCreated, onCancel }: SchoolYearFormProps) {
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4" data-testid="school-year-form">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome">
          {(a11y) => (
            <Input
              {...a11y}
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: 2027"
              className={INPUT_CLASS}
              data-testid="input-nome"
            />
          )}
        </Field>
        <Field label="Início">
          {(a11y) => (
            <Input
              {...a11y}
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={INPUT_CLASS}
              data-testid="input-inicio"
            />
          )}
        </Field>
        <Field label="Fim">
          {(a11y) => (
            <Input
              {...a11y}
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className={INPUT_CLASS}
              data-testid="input-fim"
            />
          )}
        </Field>
      </div>
      {error && (
        <Notice tone="danger" data-testid="form-error">
          {error}
        </Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={loading} data-testid="submit-button">
          {loading ? "Criando..." : "Criar ano letivo"}
        </Button>
        {onCancel && (
          <Button type="button" size="lg" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
