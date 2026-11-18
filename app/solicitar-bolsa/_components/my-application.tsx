"use client";

import Link from "next/link";

export interface MyApplicationData {
  status: "pendente" | "aprovada" | "rejeitada";
  data_envio: string;
  ano_letivo: string | null;
  alunos: Array<{ nome: string; serie: string }>;
}

const STATUS: Record<MyApplicationData["status"], { label: string; text: string; tone: string }> = {
  pendente: {
    label: "Em análise",
    text: "Sua solicitação foi recebida e está em análise pela direção da escola, que entrará em contato.",
    tone: "border-gold/50 bg-gold/10 text-fg",
  },
  aprovada: {
    label: "Aprovada",
    text: "A decisão sobre sua solicitação foi registrada. A secretaria entrará em contato com os detalhes.",
    tone: "border-success/40 bg-success/10 text-fg",
  },
  rejeitada: {
    label: "Não aprovada",
    text: "A decisão sobre sua solicitação foi registrada. A secretaria entrará em contato com os detalhes.",
    tone: "border-border bg-bg text-fg",
  },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" }).format(new Date(iso));
}

/** Acompanhamento da solicitação enviada pela conta logada. */
export function MyApplication({ application }: { application: MyApplicationData | null }) {
  if (!application) {
    return (
      <section className="rounded-xl border border-border bg-surface p-7 text-center max-sm:p-5" data-testid="my-application-empty">
        <h2 className="font-display text-[22px] font-semibold text-fg">Nenhuma solicitação enviada</h2>
        <p className="mx-auto mt-2 max-w-[44ch] text-[15px] text-muted">
          Esta conta ainda não enviou uma solicitação de bolsa.
        </p>
        <Link
          href="/solicitar-bolsa"
          className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          Preencher solicitação
        </Link>
      </section>
    );
  }

  const status = STATUS[application.status];
  return (
    <section
      aria-labelledby="my-application-title"
      className="rounded-xl border border-border bg-surface p-7 max-sm:p-5"
      data-testid="my-application"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="my-application-title" className="font-display text-[22px] font-semibold text-fg">
            Minha solicitação
          </h2>
          {application.ano_letivo && <p className="mt-1 text-sm text-muted">Ano letivo {application.ano_letivo}</p>}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.tone}`} data-testid="my-application-status">
          {status.label}
        </span>
      </div>

      <p className="mt-5 text-[15px] leading-relaxed text-fg">{status.text}</p>

      <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Enviada em</dt>
          <dd className="mt-0.5 font-medium text-fg">{formatDate(application.data_envio)}</dd>
        </div>
        <div>
          <dt className="text-muted">{application.alunos.length === 1 ? "Aluno" : "Alunos"}</dt>
          <dd className="mt-0.5 font-medium text-fg">
            <ul>
              {application.alunos.map((aluno, index) => (
                <li key={index}>
                  {aluno.nome} <span className="font-normal text-muted">· {aluno.serie}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </section>
  );
}
