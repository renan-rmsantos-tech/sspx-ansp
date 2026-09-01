import type { Metadata } from "next";
import Link from "next/link";
import { SealLogo } from "@/components/ui/seal-logo";

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
          <SealLogo size={64} className="mx-auto mb-3" />
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

        {children}
      </div>
    </div>
  );
}
