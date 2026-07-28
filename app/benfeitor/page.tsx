import type { Metadata } from "next";
import Link from "next/link";
import { DonorForm } from "./_components/donor-form";

export const metadata: Metadata = {
  title: "Seja um benfeitor — Arca N. S. da Providência",
  description:
    "Apoie as bolsas de estudo da Arca Nossa Senhora da Providência. A cada 15 benfeitores, um aluno tem acesso a uma formação integralmente católica.",
};

export default function BenfeitorPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[720px] px-4 py-8 pb-16 max-sm:px-3 max-sm:py-5">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <span aria-hidden="true">←</span>
            Voltar à página principal
          </Link>
        </div>

        <header className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-3 inline-block" aria-label="Arca N. S. da Providência — início">
            <svg
              width="64"
              height="64"
              viewBox="0 0 220 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="benf-clip">
                  <circle cx="110" cy="110" r="84" />
                </clipPath>
                <radialGradient id="benf-bg" cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#1e2a4a" />
                  <stop offset="100%" stopColor="#0f1729" />
                </radialGradient>
              </defs>
              <circle cx="110" cy="110" r="106" fill="url(#benf-bg)" stroke="#c9a84c" strokeWidth="3" />
              <circle cx="110" cy="110" r="98" fill="none" stroke="#c9a84c" strokeWidth="0.6" opacity="0.35" />
              <image
                href="/base1.png"
                x="22"
                y="30"
                width="176"
                height="184"
                clipPath="url(#benf-clip)"
                preserveAspectRatio="xMidYMid slice"
              />
              <circle cx="110" cy="110" r="84" fill="none" stroke="#0f1729" strokeWidth="12" opacity="0.2" />
            </svg>
          </Link>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted">
            Arca N. S. da Providência
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-fg max-sm:text-[22px]">
            Seja um benfeitor
          </h1>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-surface p-6 max-sm:p-5">
          <figure className="rounded-r-md border-l-[3px] border-gold bg-bg px-5 py-3.5">
            <blockquote className="font-display text-[17px] italic leading-snug text-accent text-pretty">
              “Ajudar a escola católica não é um ato de simples beneficência; é um ato de fé e de justiça.”
            </blockquote>
            <figcaption className="mt-2.5 text-[11px] font-semibold uppercase tracking-widest text-gold">
              Papa Pio XII · Discurso às Associações de Pais de Alunos de Escolas Católicas, 1954
            </figcaption>
          </figure>

          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            <p>
              A cada <strong className="text-fg">15 pessoas</strong> que doam apenas{" "}
              <strong className="text-fg">R$ 80,00 por mês</strong>, um aluno tem acesso a uma formação
              integralmente católica.
            </p>
            <p>
              Informamos que, todos os meses, uma <strong className="text-fg">missa é rezada</strong> por
              todos os nossos benfeitores.
            </p>
            <p>
              Estimado benfeitor, toda ajuda é bem-vinda. Mas, devido ao nosso compromisso em garantir a
              bolsa do ano escolar completo, preferimos que sua doação seja regular.
            </p>
          </div>
        </section>

        <section
          className="mb-8 rounded-xl border border-border bg-surface p-6 max-sm:p-5"
          aria-labelledby="dados-bancarios-titulo"
        >
          <h2
            id="dados-bancarios-titulo"
            className="font-display text-[20px] font-semibold text-fg"
          >
            Dados para transferência
          </h2>
          <p className="mt-1 text-sm text-muted">
            Utilize a conta abaixo para Pix ou transferência bancária. Depois,
            anexe o comprovante no formulário.
          </p>
          <dl className="mt-5 grid gap-3 text-[15px] sm:grid-cols-2">
            <div className="rounded-md bg-bg px-4 py-3 sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Titular / Banco
              </dt>
              <dd className="mt-1 font-medium text-fg">ACIPEC · Santander</dd>
            </div>
            <div className="rounded-md bg-bg px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Agência
              </dt>
              <dd className="mt-1 font-medium tabular-nums text-fg">0197</dd>
            </div>
            <div className="rounded-md bg-bg px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Conta
              </dt>
              <dd className="mt-1 font-medium tabular-nums text-fg">13.008003-2</dd>
            </div>
            <div className="rounded-md bg-bg px-4 py-3 sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                CNPJ
              </dt>
              <dd className="mt-1 font-medium tabular-nums text-fg">42.736.079/0001-63</dd>
            </div>
          </dl>
        </section>

        <DonorForm />
      </div>
    </div>
  );
}
