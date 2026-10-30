import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StaffRole } from "@/lib/auth/authorization";
import { cn } from "@/lib/utils";
import type { AdminHomeSummary } from "../_actions/admin-home-actions";
import { Notice } from "./notice";
import { PageHeader } from "./page-header";
import { Section } from "./section";
import { StatTile } from "./stat-tile";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10" → "outubro de 2026". */
export function competenciaLabel(competencia: string): string {
  return monthFormatter.format(new Date(`${competencia}-01T00:00:00Z`));
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

type Task = { id: string; count: number; title: string; detail: string; cta: string; href: string };

export function AdminHome({
  summary,
  role,
  error,
}: {
  summary: AdminHomeSummary | null;
  role: StaffRole;
  error?: string;
}) {
  const admin = role === "admin";
  const description = summary?.schoolYear
    ? `Ano letivo ${summary.schoolYear.nome} em andamento. Veja o que precisa de atenção e siga para a tarefa.`
    : "Nenhum ano letivo ativo. Veja o que precisa de atenção e siga para a tarefa.";

  if (!summary) {
    return (
      <div className="space-y-6">
        <PageHeader title="Início" description={description} />
        <Notice tone="danger" title="Não foi possível carregar o resumo">
          {error ?? "Tente novamente em alguns instantes."} O menu continua disponível.
        </Notice>
      </div>
    );
  }

  const month = competenciaLabel(summary.payments.competencia);
  const tasks: Task[] = [
    {
      id: "solicitacoes",
      count: summary.applications.pendente,
      title: plural(summary.applications.pendente, "solicitação aguardando decisão", "solicitações aguardando decisão"),
      detail: "Analise os documentos e registre a aprovação ou a rejeição.",
      cta: "Ver solicitações",
      href: "/admin/solicitacoes?situacao=pendente",
    },
  ];
  if (admin) {
    tasks.push(
      {
        id: "benfeitores",
        count: summary.donors.pendingWelcome,
        title: plural(summary.donors.pendingWelcome, "benfeitor sem e-mail de boas-vindas", "benfeitores sem e-mail de boas-vindas"),
        detail: "Envie a mensagem de boas-vindas ou registre o envio manual.",
        cta: "Ver benfeitores",
        href: "/admin/benfeitores?boas-vindas=pendentes",
      },
      {
        id: "pagamentos",
        count: summary.payments.count,
        title: plural(summary.payments.count, "pagamento aguardando conferência", "pagamentos aguardando conferência"),
        detail: `Confira os créditos de ${month} no extrato bancário.`,
        cta: "Conferir pagamentos",
        href: "/admin/pagamentos",
      }
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Início" description={description} />

      <Section title="Precisa de atenção">
        <div className="grid gap-3 md:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="gap-3 rounded-lg border border-border bg-surface p-5 ring-0" data-testid={`home-task-${task.id}`}>
              <div>
                <div className="font-heading text-3xl font-semibold leading-none tabular-nums text-fg">{task.count}</div>{" "}
                <p className="mt-2 text-sm font-semibold text-fg">{task.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{task.detail}</p>
              </div>
              <Link
                href={task.href}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-auto w-full justify-between")}
              >
                {task.cta}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {admin && (
        <Section title="Resumo" description="Números do momento. Os relatórios completos ficam em Relatórios.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Solicitações no ano"
              value={summary.applications.total}
              hint={`${summary.applications.aprovada} aprovadas · ${summary.applications.rejeitada} rejeitadas`}
            />
            <StatTile
              label="Benfeitores"
              value={summary.donors.total}
              hint={`${summary.donors.mensal} mensais · ${summary.donors.unica} doações únicas`}
            />
            <StatTile
              label="Contribuição mensal"
              value={currency.format(summary.donors.monthlyAmount)}
              hint="Soma dos compromissos mensais ativos"
            />
            <StatTile
              label={`Esperado em ${month}`}
              value={currency.format(summary.payments.expectedAmount)}
              hint={`${currency.format(summary.payments.confirmedAmount)} confirmados no extrato · ${summary.payments.withReceipt} com comprovante`}
            />
          </div>
        </Section>
      )}
    </div>
  );
}
