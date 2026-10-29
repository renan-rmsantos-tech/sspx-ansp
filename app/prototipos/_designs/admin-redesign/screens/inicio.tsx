"use client";

import { ArrowRight } from "lucide-react";
import type { ScreenProps } from "../shell";
import { APPLICATIONS, DONORS, PAYMENTS, SCHOOL_YEARS, currency } from "../fixtures";
import { Button, Card, PageHeader, Section, StatTile } from "../ui";

export function InicioScreen({ role, onNavigate }: ScreenProps) {
  const pending = APPLICATIONS.filter((a) => a.status === "pendente");
  const welcome = DONORS.filter((d) => d.boasVindas === "pendente");
  const payments = PAYMENTS.filter((p) => p.estado === "aguardando");
  const monthly = DONORS.filter((d) => d.frequencia === "mensal");
  const year = SCHOOL_YEARS.find((y) => y.ativo);

  const tasks = [
    {
      count: pending.length,
      title: pending.length === 1 ? "solicitação aguardando decisão" : "solicitações aguardando decisão",
      detail: "Analise os documentos e registre a aprovação ou a rejeição.",
      cta: "Ver solicitações",
      go: "solicitacoes" as const,
      show: true,
    },
    {
      count: welcome.length,
      title: welcome.length === 1 ? "benfeitor sem e-mail de boas-vindas" : "benfeitores sem e-mail de boas-vindas",
      detail: "Envie a mensagem de boas-vindas ou registre o envio manual.",
      cta: "Ver benfeitores",
      go: "benfeitores" as const,
      show: true,
    },
    {
      count: payments.length,
      title: payments.length === 1 ? "pagamento aguardando conferência" : "pagamentos aguardando conferência",
      detail: "Confira os créditos de outubro no extrato bancário.",
      cta: "Conferir pagamentos",
      go: "pagamentos" as const,
      show: role === "admin",
    },
  ].filter((t) => t.show);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Início"
        description={`Ano letivo ${year?.nome ?? "—"} em andamento. Veja o que precisa de atenção e siga para a tarefa.`}
        odId="inicio-header"
      />

      <Section title="Precisa de atenção" odId="inicio-tarefas">
        <div className="grid gap-3 md:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.go} className="flex flex-col gap-3">
              <div>
                <div className="font-heading text-3xl font-semibold leading-none tabular-nums text-fg">{task.count}</div>
                <p className="mt-2 text-sm font-semibold text-fg">{task.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{task.detail}</p>
              </div>
              <Button variant="outline" size="lg" className="mt-auto w-full justify-between" onClick={() => onNavigate(task.go)}>
                {task.cta}
                <ArrowRight aria-hidden />
              </Button>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Resumo" description="Números do momento. Os relatórios completos ficam em Relatórios." odId="inicio-resumo">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Solicitações no ano" value={APPLICATIONS.length} hint={`${APPLICATIONS.filter((a) => a.status === "aprovada").length} aprovadas · ${APPLICATIONS.filter((a) => a.status === "rejeitada").length} rejeitadas`} />
          <StatTile label="Benfeitores" value={DONORS.length} hint={`${monthly.length} mensais · ${DONORS.length - monthly.length} doações únicas`} />
          <StatTile label="Contribuição mensal" value={currency.format(monthly.reduce((s, d) => s + d.valor, 0))} hint="Soma dos compromissos mensais ativos" />
          <StatTile label="Recebido em outubro" value={currency.format(PAYMENTS.reduce((s, p) => s + p.recebido, 0))} hint={`de ${currency.format(PAYMENTS.reduce((s, p) => s + p.esperado, 0))} esperados`} />
        </div>
      </Section>
    </div>
  );
}
