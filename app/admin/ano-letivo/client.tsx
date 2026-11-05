"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "../_components/notice";
import { PageHeader } from "../_components/page-header";
import { SchoolYearList, type SchoolYear } from "../_components/school-year-list";
import { SchoolYearForm } from "../_components/school-year-form";

interface AnoLetivoClientProps {
  initialYears: SchoolYear[];
  /** Falha ao buscar os anos letivos; substitui a lista por um aviso. */
  error?: string;
  /** Formulário de novo ano já aberto na montagem. */
  initialCreating?: boolean;
  /** Data de referência (AAAA-MM-DD) para a situação de cada ano; o padrão é hoje. */
  today?: string;
  /** Ano com a confirmação de exclusão já aberta. */
  initialConfirmDeleteId?: string;
}

export function AnoLetivoClient({
  initialYears,
  error,
  initialCreating = false,
  today,
  initialConfirmDeleteId,
}: AnoLetivoClientProps) {
  const [years, setYears] = useState<SchoolYear[]>(initialYears);
  const [creating, setCreating] = useState(initialCreating);

  const handleCreated = useCallback((year: SchoolYear) => {
    setYears((prev) => [year, ...prev]);
    setCreating(false);
  }, []);

  const handleYearsChange = useCallback((updated: SchoolYear[]) => {
    setYears(updated);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ano letivo"
        description="O período de inscrições abre e encerra automaticamente nas datas cadastradas."
        action={
          !creating && (
            <Button type="button" size="lg" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" /> Novo ano letivo
            </Button>
          )
        }
      />
      {creating && (
        <Card className="gap-4 rounded-lg border border-border bg-surface p-5 ring-0">
          <h2 className="font-heading text-lg font-semibold leading-tight text-fg">Novo ano letivo</h2>
          <SchoolYearForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
        </Card>
      )}
      {error ? (
        <Notice tone="danger" title="Não foi possível carregar os anos letivos" data-testid="school-years-error">
          {error} Recarregue a página em alguns instantes.
        </Notice>
      ) : (
        <SchoolYearList
          years={years}
          onYearsChange={handleYearsChange}
          today={today}
          defaultConfirmDeleteId={initialConfirmDeleteId}
        />
      )}
    </div>
  );
}
