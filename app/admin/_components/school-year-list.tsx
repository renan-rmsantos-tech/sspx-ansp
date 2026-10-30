"use client";

import { Fragment, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toggleSchoolYear, deleteSchoolYear } from "../_actions/admin-actions";
import { EmptyState } from "./empty-state";
import { InlineConfirm } from "./inline-confirm";
import { StatusPill } from "./status-pill";

export interface SchoolYear {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

interface SchoolYearListProps {
  years: SchoolYear[];
  onYearsChange: (years: SchoolYear[]) => void;
}

type ConfirmAction = { type: "toggle" | "delete"; id: string };

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

const TH_CLASS = "px-5 py-3 font-medium";

export function SchoolYearList({ years, onYearsChange }: SchoolYearListProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(
    async (id: string, currentlyActive: boolean) => {
      if (currentlyActive) {
        setConfirmAction({ type: "toggle", id });
        return;
      }
      setLoading(true);
      const result = await toggleSchoolYear(id);
      if (result.success) {
        onYearsChange(years.map((y) => ({ ...y, ativo: y.id === id })));
      }
      setLoading(false);
    },
    [years, onYearsChange]
  );

  const confirmAndExecute = useCallback(async () => {
    if (!confirmAction) return;
    setLoading(true);

    if (confirmAction.type === "toggle") {
      const result = await toggleSchoolYear(confirmAction.id);
      if (result.success) {
        onYearsChange(
          years.map((y) => ({ ...y, ativo: y.id === confirmAction.id ? false : y.ativo }))
        );
      }
    } else {
      const result = await deleteSchoolYear(confirmAction.id);
      if (result.success) {
        onYearsChange(years.filter((y) => y.id !== confirmAction.id));
      }
    }

    setConfirmAction(null);
    setLoading(false);
  }, [confirmAction, years, onYearsChange]);

  if (years.length === 0) {
    return (
      <div data-testid="school-year-list">
        <EmptyState
          title="Nenhum ano letivo cadastrado"
          description="Use “Novo ano letivo” para criar o primeiro."
        />
      </div>
    );
  }

  return (
    <Card className="gap-0 rounded-lg border border-border bg-surface py-0 ring-0" data-testid="school-year-list">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th scope="col" className={TH_CLASS}>Ano</th>
              <th scope="col" className={TH_CLASS}>Período</th>
              <th scope="col" className={TH_CLASS}>Situação</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => {
              const confirming = confirmAction?.id === year.id ? confirmAction : null;
              return (
                <Fragment key={year.id}>
                  <tr
                    className="border-b border-border/60 last:border-0"
                    data-testid={`school-year-row-${year.id}`}
                  >
                    <td className="px-5 py-3 font-semibold text-fg">{year.nome}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDate(year.data_inicio)} a {formatDate(year.data_fim)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill tone={year.ativo ? "success" : "neutral"} data-testid="status-badge">
                        {year.ativo ? "Ativo" : "Encerrado"}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={year.ativo ? "ghost" : "outline"}
                          onClick={() => void handleToggle(year.id, year.ativo)}
                          disabled={loading || confirmAction !== null}
                          data-testid="toggle-button"
                        >
                          {year.ativo ? "Desativar" : "Tornar ativo"}
                        </Button>
                        {!year.ativo && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:text-danger"
                            onClick={() => setConfirmAction({ type: "delete", id: year.id })}
                            disabled={loading || confirmAction !== null}
                            data-testid="delete-button"
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {confirming && (
                    <tr className="border-b border-border/60 last:border-0">
                      <td colSpan={4} className="px-5 pb-4 pt-1">
                        <InlineConfirm
                          question={
                            confirming.type === "delete"
                              ? "Excluir este ano letivo?"
                              : "Desativar este ano letivo?"
                          }
                          confirmLabel={confirming.type === "delete" ? "Sim, excluir" : "Sim, desativar"}
                          cancelLabel="Não"
                          onConfirm={() => void confirmAndExecute()}
                          onCancel={() => setConfirmAction(null)}
                          pending={loading}
                          confirmTestId="confirm-ok"
                          cancelTestId="confirm-cancel"
                          data-testid="confirm-dialog"
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
