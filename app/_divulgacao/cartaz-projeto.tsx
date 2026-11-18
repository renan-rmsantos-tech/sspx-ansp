import { SealLogo } from "@/components/ui/seal-logo";
import { FSSPX_LOGO_PRINT_SRC, SITE_QR_SRC, SITE_URL, materialTokens } from "./material";

export type CartazOrientacao = "retrato" | "paisagem";

/** Tamanho da página impressa (largura e altura) em cada orientação. */
const PAGINA: Record<CartazOrientacao, string> = {
  retrato: "600mm 1000mm",
  paisagem: "1000mm 600mm",
};

const styles = `
.ansp-cartaz-projeto {
  margin: 0 auto; position: relative; overflow: hidden;
  /* Fundo azul sob todas as faixas: nenhuma emenda clara entre o topo e o rodapé. */
  background: var(--night-deep); display: grid;
  /* Na tela a peça aparece reduzida; a impressão usa o tamanho real. */
  zoom: 0.3;
}
.ansp-cartaz-projeto::before {
  content: ""; z-index: 2; position: absolute; inset: 30mm;
  border: 1mm solid var(--gold); pointer-events: none;
}
.ansp-cartaz-projeto.retrato { width: 600mm; height: 1000mm; grid-template-rows: 1fr auto auto; }
.ansp-cartaz-projeto.paisagem { width: 1000mm; height: 600mm; grid-template-columns: 560mm 1fr; grid-template-rows: 1fr auto; }

/* Identidade: o nome da Arca é o título da peça */
.ansp-cartaz-projeto .hero {
  background: radial-gradient(95% 75% at 50% 22%, var(--night-glow) 0%, var(--night-deep) 78%);
  color: oklch(96% 0.01 85); text-align: center;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.ansp-cartaz-projeto.retrato .hero { padding: 46mm 56mm 28mm; }
.ansp-cartaz-projeto.paisagem .hero { padding: 46mm 34mm 10mm 62mm; }
.ansp-cartaz-projeto .hero img.seal { display: block; width: 128mm; height: 128mm; }
.ansp-cartaz-projeto.paisagem .hero img.seal { width: 124mm; height: 124mm; }
.ansp-cartaz-projeto .hero h1 {
  font: 600 44mm/1.04 var(--font-display); letter-spacing: -0.01em;
  color: var(--gold); text-wrap: balance; margin-top: 16mm;
}
.ansp-cartaz-projeto.paisagem .hero h1 { font-size: 37mm; margin-top: 13mm; }
.ansp-cartaz-projeto .tagline {
  font: 500 21mm/1.16 var(--font-display); color: oklch(97% 0.008 85);
  text-wrap: balance; margin-top: 15mm;
}
.ansp-cartaz-projeto.paisagem .tagline { font-size: 18mm; margin-top: 11mm; }
.ansp-cartaz-projeto .tagline em { font-style: italic; color: var(--gold); }
.ansp-cartaz-projeto .sub { font: 400 13mm/1.4 var(--font-body); color: oklch(84% 0.02 85); margin-top: 11mm; }
.ansp-cartaz-projeto.paisagem .sub { font-size: 11.5mm; margin-top: 8mm; }
.ansp-cartaz-projeto .rule { width: 56mm; height: 1.2mm; border: 0; background: var(--gold); margin-top: 18mm; }
.ansp-cartaz-projeto.paisagem .rule { margin-top: 14mm; }

/* Citação de Pio XI, a mesma do site */
.ansp-cartaz-projeto .quote { margin-top: 16mm; max-width: 470mm; }
.ansp-cartaz-projeto.paisagem .quote { margin-top: 13mm; max-width: 450mm; }
.ansp-cartaz-projeto .quote blockquote {
  font: italic 400 18.5mm/1.24 var(--font-display); color: oklch(93% 0.014 85); text-wrap: balance;
}
.ansp-cartaz-projeto.paisagem .quote blockquote { font-size: 15.5mm; }
.ansp-cartaz-projeto .quote figcaption {
  font: 600 10mm/1 var(--font-body); letter-spacing: 0.18em; text-indent: 0.18em;
  text-transform: uppercase; color: var(--gold); margin-top: 10mm;
}
.ansp-cartaz-projeto.paisagem .quote figcaption { font-size: 8.5mm; margin-top: 8mm; }

/* Apresentação da obra e acesso ao site */
.ansp-cartaz-projeto .access { background: var(--cream); display: grid; align-content: center; }
.ansp-cartaz-projeto.retrato .access { border-top: 1.4mm solid var(--gold); padding: 28mm 56mm 22mm; row-gap: 20mm; }
.ansp-cartaz-projeto.paisagem .access {
  grid-column: 2; grid-row: 1 / span 2; border-left: 1.4mm solid var(--gold);
  padding: 46mm 72mm 46mm 44mm; row-gap: 24mm;
}
.ansp-cartaz-projeto .story {
  font: 400 14mm/1.5 var(--font-body); color: var(--fg);
  /* Justificado, com recuo de parágrafo na primeira linha. */
  text-align: justify; text-indent: 2em; text-wrap: pretty;
}
.ansp-cartaz-projeto.paisagem .story { font-size: 13mm; line-height: 1.48; }
/* A coluna estreita do cartaz deitado abre buracos no justificado sem hifenização. */
.ansp-cartaz-projeto.paisagem .story { hyphens: auto; -webkit-hyphens: auto; }
.ansp-cartaz-projeto .story strong { font-weight: 700; color: var(--gold-deep); hyphens: none; -webkit-hyphens: none; }
.ansp-cartaz-projeto .cta {
  display: grid; align-items: center; grid-template-columns: 1fr 140mm; column-gap: 26mm;
  padding-top: 20mm; border-top: 0.6mm solid oklch(72% 0.10 80 / 0.7);
}
.ansp-cartaz-projeto.paisagem .cta { grid-template-columns: 1fr 140mm; column-gap: 18mm; padding-top: 20mm; }
.ansp-cartaz-projeto .invite h2 { font: 600 30mm/1.1 var(--font-display); letter-spacing: -0.01em; white-space: nowrap; }
.ansp-cartaz-projeto.paisagem .invite h2 { font-size: 25mm; white-space: normal; }
.ansp-cartaz-projeto .url { font: 600 14mm/1.2 var(--font-body); white-space: nowrap; margin-top: 11mm; }
.ansp-cartaz-projeto.paisagem .url { font-size: 10mm; margin-top: 8mm; }
.ansp-cartaz-projeto .qr { text-align: center; }
.ansp-cartaz-projeto .qr .frame { background: var(--surface); border: 0.8mm solid var(--border); border-radius: 5mm; padding: 10mm; }
.ansp-cartaz-projeto.paisagem .qr .frame { padding: 8mm; }
.ansp-cartaz-projeto .qr img { display: block; width: 100%; height: auto; }
.ansp-cartaz-projeto .qr .scan {
  font: 600 9.5mm/1 var(--font-body); letter-spacing: 0.14em; text-indent: 0.14em;
  text-transform: uppercase; color: var(--gold-deep); margin-top: 8mm; white-space: nowrap;
}
.ansp-cartaz-projeto.paisagem .qr .scan { font-size: 8.5mm; margin-top: 7mm; }

/* Fraternidade */
.ansp-cartaz-projeto .foot {
  background: var(--night-deep); color: oklch(86% 0.02 85);
  display: flex; align-items: center; justify-content: center; gap: 11mm;
  font: 500 12mm/1.3 var(--font-body); letter-spacing: 0.05em;
}
.ansp-cartaz-projeto.retrato .foot { padding: 14mm 56mm 44mm; }
.ansp-cartaz-projeto.paisagem .foot { padding: 4mm 34mm 44mm 62mm; font-size: 11mm; }
.ansp-cartaz-projeto .foot img { display: block; width: 36mm; height: 36mm; }
.ansp-cartaz-projeto.paisagem .foot img { width: 32mm; height: 32mm; }

@media print { .ansp-cartaz-projeto { margin: 0; zoom: 1; } }
`;

const ARCA = "Arca Nossa Senhora da Providência";

/**
 * Cartaz de grande formato (100 × 60 cm) que apresenta o projeto: selo e nome
 * da Arca, frase da landing, citação de Pio XI, apresentação da obra, convite
 * aos benfeitores e QR Code do site. `orientacao` escolhe entre 60 × 100 cm em
 * pé e 100 × 60 cm deitado.
 */
export function CartazProjeto({ orientacao }: { orientacao: CartazOrientacao }) {
  const page = `@page { size: ${PAGINA[orientacao]}; margin: 0; }`;
  return (
    <div className="ansp-material ansp-material-mesa">
      <style dangerouslySetInnerHTML={{ __html: materialTokens + page + styles }} />
      <main className={`ansp-cartaz-projeto ${orientacao}`}>
        <header className="hero" data-od-id="identidade">
          <SealLogo size={250} className="seal" />
          <h1>{ARCA}</h1>
          <p className="tagline">
            Educar para a Eternidade, sob o manto da <em>Providência</em>.
          </p>
          <p className="sub">Obra de assistência educacional católica</p>
          <hr className="rule" />
          <figure className="quote">
            <blockquote>
              “O fim próprio e imediato da educação cristã é cooperar com a graça divina na formação do
              verdadeiro e perfeito cristão.”
            </blockquote>
            <figcaption>Pio XI · Divini Illius Magistri</figcaption>
          </figure>
        </header>

        <section className="access" aria-label="A obra e o site" data-od-id="acesso">
          <p className="story" lang="pt-BR">
            Toda família católica busca o grande e indispensável bem de uma educação íntegra, tanto
            intelectual quanto moralmente, para os seus filhos. Sabemos que, nos dias de hoje, os
            desafios para oferecer uma formação verdadeiramente tradicional e livre dos erros do mundo
            são imensos — tanto no combate espiritual quanto no aspecto financeiro. É por isso que a{" "}
            <strong>{ARCA}</strong> nasce com o firme propósito de estender as mãos a essas famílias.
          </p>
          <div className="cta">
            <div className="invite">
              <h2>Seja um benfeitor</h2>
              <p className="url">{SITE_URL}</p>
            </div>
            <div className="qr">
              <div className="frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SITE_QR_SRC} alt={`QR Code para ${SITE_URL}`} />
              </div>
              <p className="scan">Aponte a câmera</p>
            </div>
          </div>
        </section>

        <footer className="foot" data-od-id="fraternidade">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FSSPX_LOGO_PRINT_SRC} alt="" />
          <span>Fraternidade Sacerdotal São Pio X</span>
        </footer>
      </main>
    </div>
  );
}
