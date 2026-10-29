"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "../_components/page-header";
import { SchoolYearList, type SchoolYear } from "../_components/school-year-list";
import { SchoolYearForm } from "../_components/school-year-form";

interface AnoLetivoClientProps {
  initialYears: SchoolYear[];
}

export function AnoLetivoClient({ initialYears }: AnoLetivoClientProps) {
  const [years, setYears] = useState<SchoolYear[]>(initialYears);
  const [creating, setCreating] = useState(false);

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
        description="O ano ativo é o que aparece no formulário público e nos documentos. Só um ano pode estar ativo."
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
      <SchoolYearList years={years} onYearsChange={handleYearsChange} />
    </div>
  );
}
