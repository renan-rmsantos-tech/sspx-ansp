import type { Metadata } from "next";
import Link from "next/link";
import {
  SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE,
  SCHOLARSHIP_UPLOADS_ENABLED,
} from "@/lib/form/scholarship-uploads";

export const metadata: Metadata = {
  title: "Solicitação de Bolsa — Arca N. S. da Providência",
  description:
    "Formulário de solicitação de bolsa para família necessitada — Ano Letivo 2026",
};

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[720px] px-4 py-8 pb-16 max-sm:px-3 max-sm:py-5">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent/80"
            data-testid="form-back-home"
          >
            <span aria-hidden="true">←</span> Voltar à página principal
          </Link>
        </div>

        <header className="mb-10 text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 220 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto mb-3"
            role="img"
            aria-label="Logo Arca N. S. da Providência"
          >
            <defs>
              <clipPath id="form-clip">
                <circle cx="110" cy="110" r="84" />
              </clipPath>
              <radialGradient id="form-bg" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#1e2a4a" />
                <stop offset="100%" stopColor="#0f1729" />
              </radialGradient>
            </defs>
            <circle cx="110" cy="110" r="106" fill="url(#form-bg)" />
            <circle
              cx="110"
              cy="110"
              r="98"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="0.6"
              opacity="0.35"
            />
            <image
              href="/base1.png"
              x="22"
              y="30"
              width="176"
              height="184"
              clipPath="url(#form-clip)"
              preserveAspectRatio="xMidYMid slice"
            />
            <circle
              cx="110"
              cy="110"
              r="84"
              fill="none"
              stroke="#0f1729"
              strokeWidth="12"
              opacity="0.2"
            />
            <path
              id="form-top"
              d="M 18,110 a 92,92 0 0,1 184,0"
              fill="none"
            />
            <text
              fill="#c9a84c"
              fontFamily="'Iowan Old Style','Charter','Palatino',Georgia,serif"
              fontSize="12.5"
              fontWeight="700"
              letterSpacing="0.18em"
            >
              <textPath href="#form-top" startOffset="50%" textAnchor="middle">
                ARCA
              </textPath>
            </text>
            <path
              id="form-bot"
              d="M 20,118 a 90,90 0 0,0 180,0"
              fill="none"
            />
            <text
              fill="#c9a84c"
              fontFamily="'Iowan Old Style','Charter','Palatino',Georgia,serif"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.14em"
            >
              <textPath href="#form-bot" startOffset="50%" textAnchor="middle">
                N. S. DA PROVIDÊNCIA
              </textPath>
            </text>
            <circle
              cx="110"
              cy="110"
              r="106"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="3"
            />
          </svg>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted">
            Arca N. S. da Providência
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-fg max-sm:text-[22px]">
            Solicitação de Bolsa
          </h1>
          <p className="mx-auto mt-2 max-w-[50ch] text-[15px] text-muted">
            Consulte a disponibilidade do período de inscrições e preencha os
            dados solicitados quando o formulário estiver aberto.
          </p>
        </header>

        <section className="mb-10 rounded-xl border border-border bg-surface p-6 max-sm:p-5">
          <h2 className="text-center font-display text-[22px] font-semibold leading-snug tracking-tight text-accent text-balance max-sm:text-[19px]">
            Educando para a Eternidade, sob o Manto da Providência Divina
          </h2>
          <hr className="mx-auto my-4 h-0.5 w-12 border-0 bg-gold" />
          <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            <p>
              Conscientes de que o fim do homem não é outro senão a vida eterna, e de que a formação
              católica tem por meta única proporcionar à alma os meios para alcançar a salvação, abraçamos
              com fidelidade a máxima do Papa <em className="text-accent">Pio XI</em> em sua encíclica{" "}
              <em className="text-accent">Divini Illius Magistri</em>:
            </p>
            <figure className="rounded-r-md border-l-[3px] border-gold bg-bg px-5 py-3.5">
              <blockquote className="font-display text-[17px] italic leading-snug text-accent text-pretty">
                “O fim próprio e imediato da educação cristã é cooperar com a graça divina na formação do
                verdadeiro e perfeito cristão.”
              </blockquote>
              <figcaption className="mt-2.5 text-[11px] font-semibold uppercase tracking-widest text-gold">
                Pio XI · Divini Illius Magistri
              </figcaption>
            </figure>
            <p>
              A Arca Nossa Senhora da Providência nasce com o firme propósito de estender as mãos às
              famílias católicas que buscam este grande e indispensável bem para os seus filhos. Sabemos
              que, nos dias de hoje, os desafios para oferecer uma educação verdadeiramente tradicional e
              livre dos erros do mundo são imensos — tanto no combate espiritual quanto no aspecto financeiro.
            </p>
            <p>
              Compreendendo o sacrifício e o preço desta formação, nossa missão é viabilizar bolsas de
              estudo para aquelas famílias que, inteiramente abandonadas à Santa Vontade de Deus, não medem
              esforços para cumprir o grave dever imposto pelo Magistério:
            </p>
            <figure className="rounded-r-md border-l-[3px] border-gold bg-bg px-5 py-3.5">
              <blockquote className="font-display text-[17px] italic leading-snug text-accent text-pretty">
                “De nenhum modo se pode admitir uma educação que não seja inteiramente cristã.”
              </blockquote>
              <figcaption className="mt-2.5 text-[11px] font-semibold uppercase tracking-widest text-gold">
                Pio XI
              </figcaption>
            </figure>
            <p>
              Como o próprio nome indica, nossa obra é fruto do sacrifício, da resignação e da confiança na
              Providência Divina, que nunca desampara os seus eleitos.
            </p>
            <p>
              A Arca Nossa Senhora da Providência está estreitamente ligada ao apostolado da{" "}
              <em className="text-accent">Fraternidade Sacerdotal São Pio X</em> (FSSPX). Buscamos, de modo
              especial — mas não exclusivo —, amparar as famílias que se submetem a este santo apostolado e
              que desejam confiar a formação intelectual, moral e espiritual de seus filhos às escolas e
              priorados da Fraternidade.
            </p>
            <p className="font-display text-[17px] font-semibold leading-snug text-accent text-balance">
              Ajudar a formar as almas de hoje é garantir os santos de amanhã.
            </p>
          </div>
        </section>

        {!SCHOLARSHIP_UPLOADS_ENABLED && (
          <aside
            className="mb-8 rounded-xl border border-gold/40 bg-gold/10 p-5"
            role="status"
            data-testid="uploads-disabled-banner"
          >
            <h2 className="font-display text-[17px] font-semibold text-accent">
              Envio de documentos desativado
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE}
            </p>
          </aside>
        )}

        {children}
      </div>
    </div>
  );
}
