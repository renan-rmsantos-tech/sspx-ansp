import { SealLogo } from "@/components/ui/seal-logo";
import { CONTACT_EMAIL, MOTTO, SITE_QR_SRC, SITE_URL, materialTokens } from "./material";

const styles = `
@page { size: A4 portrait; margin: 0; }
.ansp-cartaz-familias {
  width: 210mm; height: 297mm; margin: 0 auto;
  background: var(--bg);
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.ansp-cartaz-familias::before {
  content: ""; z-index: 2; position: absolute; inset: 5mm;
  border: 0.35mm solid var(--gold); pointer-events: none;
}
.ansp-cartaz-familias .hero {
  background: var(--night); color: oklch(96% 0.01 85);
  padding: 16mm 18mm 14mm; text-align: center;
}
.ansp-cartaz-familias .hero img.seal { width: 34mm; height: 34mm; display: block; margin: 0 auto 6mm; }
.ansp-cartaz-familias .org { font: 600 8pt/1 var(--font-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.ansp-cartaz-familias .hero h1 {
  font: 600 30pt/1.08 var(--font-display); letter-spacing: -0.01em;
  margin-top: 4mm; color: oklch(98% 0.008 85); text-wrap: balance;
}
.ansp-cartaz-familias .hero h1 em { font-style: italic; color: var(--gold); }
.ansp-cartaz-familias .hero .lead {
  font: 400 10.5pt/1.55 var(--font-body); color: oklch(86% 0.02 85);
  max-width: 150mm; margin: 5mm auto 0; text-wrap: pretty;
}
.ansp-cartaz-familias .body { padding: 11mm 18mm 0; display: grid; gap: 9mm; }
.ansp-cartaz-familias .kicker { font: 600 8.5pt/1 var(--font-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-deep); }
.ansp-cartaz-familias .steps { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 4mm; }
.ansp-cartaz-familias .step {
  background: var(--surface); border: 0.3mm solid var(--border); border-radius: 2mm;
  padding: 5mm 4.5mm; display: grid; gap: 2.5mm; align-content: start;
}
.ansp-cartaz-familias .step b { font: 600 20pt/1 var(--font-display); color: var(--gold-deep); }
.ansp-cartaz-familias .step span { font: 500 10pt/1.4 var(--font-body); }
.ansp-cartaz-familias blockquote {
  border-left: 0.6mm solid var(--gold); padding: 1mm 0 1mm 6mm;
}
.ansp-cartaz-familias blockquote p { font: italic 400 13pt/1.4 var(--font-display); text-wrap: balance; }
.ansp-cartaz-familias blockquote cite { display: block; margin-top: 2mm; font: 600 7.5pt/1 var(--font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-deep); font-style: normal; }
.ansp-cartaz-familias .mission { font: 400 9.5pt/1.55 var(--font-body); color: var(--muted); }
.ansp-cartaz-familias .access {
  margin-top: auto; display: grid; grid-template-columns: 1fr 46mm; gap: 8mm; align-items: center;
  background: var(--cream); border-top: 0.5mm solid var(--gold); padding: 6mm 18mm 6mm;
}
.ansp-cartaz-familias .access h2 { font: 600 17pt/1.15 var(--font-display); margin-top: 2mm; text-wrap: balance; }
.ansp-cartaz-familias .access p { font: 400 9.5pt/1.5 var(--font-body); color: var(--muted); margin-top: 2.5mm; }
.ansp-cartaz-familias .access .fsspx { margin-top: 4mm; font: 500 8pt/1.3 var(--font-body); color: var(--muted); }
.ansp-cartaz-familias .qr { text-align: center; }
.ansp-cartaz-familias .qr .frame { background: var(--surface); border: 0.3mm solid var(--border); border-radius: 2mm; padding: 3.5mm; }
.ansp-cartaz-familias .qr img { width: 100%; height: auto; display: block; image-rendering: pixelated; }
.ansp-cartaz-familias .qr .scan { font: 600 7.5pt/1 var(--font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-deep); margin-top: 2.5mm; }
.ansp-cartaz-familias .qr .url { font: 600 8.6pt/1.2 var(--font-body); margin-top: 1.4mm; word-break: break-all; }
.ansp-cartaz-familias .foot {
  display: flex; justify-content: space-between; align-items: baseline; gap: 6mm;
  padding: 4mm 18mm 10mm; background: var(--cream);
  font: 400 8pt/1.3 var(--font-body); color: var(--muted);
}
.ansp-cartaz-familias .foot q { font: italic 400 9.5pt/1.3 var(--font-display); color: var(--fg); quotes: "“" "”"; }
@media print { .ansp-cartaz-familias { margin: 0; } }
`;

/**
 * Cartaz A4 para famílias: convite para pedir a bolsa pelo site, com os três
 * passos da solicitação. Os textos são os da landing (seção "Faça sua
 * solicitação" e "Quem somos"); o QR Code leva ao site, como no cartaz dos
 * benfeitores.
 */
export function CartazFamilias() {
  return (
    <div className="ansp-material ansp-material-mesa">
      <style dangerouslySetInnerHTML={{ __html: materialTokens + styles }} />
      <main className="ansp-cartaz-familias">
        <header className="hero">
          <SealLogo size={128} className="seal" />
          <p className="org">Arca Nossa Senhora da Providência</p>
          <h1>
            Peça sua <em>bolsa de estudos</em>
          </h1>
          <p className="lead">
            Se a sua família busca este grande e indispensável bem para os seus filhos, preencha o formulário com os
            dados do responsável, dos alunos e a situação financeira. Confiando na Providência, a comissão avaliadora
            analisa cada pedido com cuidado e responde dentro do prazo informado.
          </p>
        </header>

        <div className="body">
          <section aria-labelledby="cartaz-familias-passos">
            <span className="kicker" id="cartaz-familias-passos">Faça sua solicitação</span>
            <ol className="steps">
              <li className="step">
                <b>01</b>
                <span>Preencha os dados da família e dos alunos</span>
              </li>
              <li className="step">
                <b>02</b>
                <span>Anexe a documentação solicitada</span>
              </li>
              <li className="step">
                <b>03</b>
                <span>Aguarde a análise da comissão avaliadora</span>
              </li>
            </ol>
          </section>

          <blockquote>
            <p>“De nenhum modo se pode admitir uma educação que não seja inteiramente cristã.”</p>
            <cite>Pio XI · Divini Illius Magistri</cite>
          </blockquote>

          <p className="mission">
            Compreendendo o sacrifício e o preço desta formação, nossa missão é viabilizar bolsas de estudo para aquelas
            famílias que, inteiramente abandonadas à Santa Vontade de Deus, não medem esforços para cumprir o grave
            dever imposto pelo Magistério.
          </p>
        </div>

        <section className="access">
          <div>
            <span className="kicker">Solicitar bolsa</span>
            <h2>O pedido é feito pelo site</h2>
            <p>Acesse o site e abra o formulário de solicitação em “Solicitar bolsa”.</p>
            <p className="fsspx">Obra ligada ao apostolado da Fraternidade Sacerdotal São Pio X (FSSPX)</p>
          </div>
          <div className="qr">
            <div className="frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SITE_QR_SRC} alt={`QR Code para ${SITE_URL}`} />
            </div>
            <p className="scan">Aponte a câmera</p>
            <p className="url">{SITE_URL}</p>
          </div>
        </section>

        <footer className="foot">
          <q>{MOTTO}</q>
          <span>{CONTACT_EMAIL}</span>
        </footer>
      </main>
    </div>
  );
}
