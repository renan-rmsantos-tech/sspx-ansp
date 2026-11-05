import { HandHeart, School, Users } from "lucide-react";
import { SealLogo } from "@/components/ui/seal-logo";
import { CONTACT_EMAIL, FSSPX_LOGO_SRC, MOTTO, SITE_QR_SRC, SITE_URL, materialTokens } from "./material";

const styles = `
@page { size: A4 portrait; margin: 0; }
.ansp-cartaz {
  width: 210mm; height: 297mm; margin: 0 auto;
  background: var(--bg);
  padding: 13mm 16mm 10mm;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.ansp-cartaz::before {
  content: ""; z-index: 2; position: absolute; inset: 5mm;
  border: 0.35mm solid var(--gold); pointer-events: none;
}

/* Cabeçalho */
.ansp-cartaz .hero { margin: -13mm -16mm 0; padding: 13mm 18mm 11mm; background: var(--night); color: oklch(96% 0.01 85); }
.ansp-cartaz .hero-main { display: grid; grid-template-columns: 28mm 1fr auto; gap: 6mm; align-items: center; }
.ansp-cartaz .hero-fsspx { padding-left: 5mm; border-left: 0.3mm solid oklch(72% 0.10 80 / 0.45); }
.ansp-cartaz .hero-fsspx img { width: 18mm; height: 18mm; display: block; }
.ansp-cartaz .hero-seal img { width: 28mm; height: 28mm; display: block; }
.ansp-cartaz .org { font: 600 8pt/1 var(--font-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 3mm; }
.ansp-cartaz .hero h1 { font: 600 22pt/1.1 var(--font-display); letter-spacing: -0.01em; text-wrap: balance; color: oklch(98% 0.008 85); }
.ansp-cartaz .hero h1 em { font-style: italic; color: var(--gold); }
.ansp-cartaz .kicker { font: 600 8.5pt/1 var(--font-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-deep); }

.ansp-cartaz .title { margin-top: 8mm; }
.ansp-cartaz .title p { font: 400 10.5pt/1.5 var(--font-body); color: var(--muted); max-width: 160mm; }

/* Esquema */
.ansp-cartaz .scheme { position: relative; width: 178mm; height: 104mm; margin: 9mm 0 6mm; }
.ansp-cartaz .scheme svg.arrows { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ansp-cartaz .node {
  position: absolute; background: var(--surface);
  border: 0.3mm solid var(--border); border-radius: 2mm; padding: 3mm 3.5mm;
  display: grid; grid-template-columns: 11mm 1fr; gap: 3mm; align-items: center;
}
.ansp-cartaz .icon {
  width: 11mm; height: 11mm; border-radius: 50%; background: var(--cream);
  border: 0.3mm solid oklch(72% 0.10 80 / 0.55); display: grid; place-items: center;
  color: var(--gold-deep);
}
.ansp-cartaz .icon svg { width: 6mm; height: 6mm; }
.ansp-cartaz .node .role { font: 600 7pt/1 var(--font-body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-deep); }
.ansp-cartaz .node h2 { font: 600 13pt/1.15 var(--font-display); margin-top: 1.5mm; }
.ansp-cartaz .node p { font: 400 8.2pt/1.4 var(--font-body); color: var(--muted); margin-top: 1.5mm; }
.ansp-cartaz .n-benfeitor { left: 49mm; top: 0; width: 80mm; }
.ansp-cartaz .n-arca {
  left: 49mm; top: 36mm; width: 80mm; background: var(--accent);
  border-color: var(--gold); border-width: 0.5mm; grid-template-columns: 15mm 1fr; padding: 3.5mm 4mm;
}
.ansp-cartaz .n-arca img { width: 15mm; height: 15mm; display: block; }
.ansp-cartaz .n-arca .role { color: var(--gold); }
.ansp-cartaz .n-arca h2 { color: oklch(98% 0.01 85); font-size: 12.5pt; }
.ansp-cartaz .n-arca p { color: oklch(86% 0.02 85); }
.ansp-cartaz .n-escola { left: 0; top: 76mm; width: 70mm; }
.ansp-cartaz .n-familia { left: 108mm; top: 76mm; width: 70mm; }
.ansp-cartaz .label { position: absolute; font: 500 7.8pt/1.3 var(--font-body); color: var(--fg); background: var(--bg); padding: 0.6mm 1.2mm; }
.ansp-cartaz .l-doa { left: 92mm; top: 27.5mm; }
.ansp-cartaz .l-recursos { left: 4mm; top: 49mm; width: 40mm; text-align: right; }
.ansp-cartaz .l-solicita { left: 138mm; top: 49mm; width: 40mm; }
.ansp-cartaz .l-escola-familia { left: 70mm; top: 92mm; width: 38mm; text-align: center; background: transparent; }

/* Divulgação */
.ansp-cartaz .share {
  margin-top: auto; display: grid; grid-template-columns: 1fr 50mm; gap: 8mm; align-items: center;
  background: var(--cream); border-top: 0.5mm solid var(--gold); padding: 5mm 7mm;
}
.ansp-cartaz .share h2 { font: 600 17pt/1.15 var(--font-display); text-wrap: balance; margin-top: 2mm; }
.ansp-cartaz .share .lead { font: 400 9.5pt/1.5 var(--font-body); color: var(--muted); margin-top: 2.5mm; }
.ansp-cartaz .share ul { list-style: none; margin-top: 3mm; display: grid; gap: 1.5mm; }
.ansp-cartaz .share li { font: 400 9pt/1.4 var(--font-body); display: grid; grid-template-columns: 4mm 1fr; }
.ansp-cartaz .share li::before { content: ""; width: 1.6mm; height: 1.6mm; background: var(--gold); margin-top: 1.6mm; transform: rotate(45deg); }
.ansp-cartaz .share li b { font-weight: 600; }
.ansp-cartaz .qr { text-align: center; }
.ansp-cartaz .qr .frame { background: var(--surface); border: 0.3mm solid var(--border); border-radius: 2mm; padding: 3.5mm; }
.ansp-cartaz .qr img { width: 100%; height: auto; display: block; image-rendering: pixelated; }
.ansp-cartaz .qr .scan { font: 600 7.5pt/1 var(--font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-deep); margin-top: 2.5mm; }
.ansp-cartaz .qr .url { font: 600 8.6pt/1.2 var(--font-body); margin-top: 1.4mm; word-break: break-all; }

.ansp-cartaz .foot { margin-top: 4.5mm; display: flex; justify-content: space-between; align-items: baseline; gap: 6mm; font: 400 8pt/1.3 var(--font-body); color: var(--muted); }
.ansp-cartaz .foot q { font: italic 400 9.5pt/1.3 var(--font-display); color: var(--fg); quotes: "“" "”"; }
@media print { .ansp-cartaz { margin: 0; } }
`;

/**
 * Cartaz A4 "Como funciona" para benfeitores: o esquema benfeitores → Arca →
 * escola ↔ família e o convite para divulgar, com QR Code do site. É o
 * cartaz impresso de `docs/design/cartaz-divulgacao/`, agora como view.
 */
export function CartazBenfeitores() {
  return (
    <div className="ansp-material ansp-material-mesa">
      <style dangerouslySetInnerHTML={{ __html: materialTokens + styles }} />
      <main className="ansp-cartaz">
        <header className="hero">
          <div className="hero-main">
            <div className="hero-seal">
              <SealLogo size={106} />
            </div>
            <div>
              <p className="org">Arca Nossa Senhora da Providência</p>
              <h1>
                Uma estrutura comum para dar estabilidade às <em>bolsas</em>
              </h1>
            </div>
            <div className="hero-fsspx">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FSSPX_LOGO_SRC} alt="Fraternidade Sacerdotal São Pio X (FSSPX)" />
            </div>
          </div>
        </header>

        <section className="title">
          <p>
            A Arca organiza recursos e processos para apoiar as escolas e ampliar o acesso de crianças à formação
            católica. Veja como cada parte contribui.
          </p>
        </section>

        <section
          className="scheme"
          aria-label="Esquema: como funciona a relação entre benfeitores, Arca, escola e família solicitante"
        >
          <svg className="arrows" viewBox="0 0 178 104" aria-hidden="true">
            <defs>
              <marker id="cartaz-head" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#b08a2e" />
              </marker>
            </defs>
            <g fill="none" stroke="#b08a2e" strokeWidth="0.6" strokeLinecap="round">
              <path d="M89 25.5 L89 35" markerEnd="url(#cartaz-head)" />
              <path d="M47.5 56 C 38 57, 33 64, 32 74.5" markerEnd="url(#cartaz-head)" />
              <path d="M131.5 56 C 140 57, 145 64, 146 74.5" markerStart="url(#cartaz-head)" markerEnd="url(#cartaz-head)" />
              <path d="M71.5 90 L106.5 90" strokeDasharray="1.6 1.4" markerStart="url(#cartaz-head)" markerEnd="url(#cartaz-head)" />
            </g>
          </svg>

          <article className="node n-benfeitor">
            <span className="icon" aria-hidden="true"><HandHeart strokeWidth={1.6} /></span>
            <div>
              <span className="role">Quem sustenta</span>
              <h2>Benfeitores</h2>
              <p>Contribuem com recursos e confiança para sustentar o trabalho da Associação.</p>
            </div>
          </article>

          <article className="node n-arca">
            <SealLogo size={57} decorative />
            <div>
              <span className="role">Quem organiza</span>
              <h2>Arca N. S. da Providência</h2>
              <p>Organiza e direciona os recursos, os critérios e os processos, prestando contas da sua atuação.</p>
            </div>
          </article>

          <article className="node n-escola">
            <span className="icon" aria-hidden="true"><School strokeWidth={1.6} /></span>
            <div>
              <span className="role">Quem educa</span>
              <h2>Escola</h2>
              <p>Identifica as necessidades e acompanha os alunos, mantendo sua responsabilidade educativa.</p>
            </div>
          </article>

          <article className="node n-familia">
            <span className="icon" aria-hidden="true"><Users strokeWidth={1.6} /></span>
            <div>
              <span className="role">Quem solicita</span>
              <h2>Família solicitante</h2>
              <p>Pede a bolsa pelo site, recebe o apoio e cumpre os compromissos da parceria.</p>
            </div>
          </article>

          <span className="label l-doa">Doações regulares</span>
          <span className="label l-recursos">Recursos para as bolsas</span>
          <span className="label l-solicita">Solicitação e análise da comissão</span>
          <span className="label l-escola-familia">Acompanhamento do aluno</span>
        </section>

        <section className="share">
          <div>
            <span className="kicker">Ajude a divulgar</span>
            <h2>Esta obra cresce quando todos a fazem conhecida</h2>
            <p className="lead">
              Compartilhe este cartaz com sua família, seus amigos e conhecidos. Alguém perto de você pode querer ajudar.
            </p>
            <ul>
              <li>
                <span>
                  <b>Quer ajudar?</b> A cada 15 pessoas que doam R$ 80,00 por mês, um aluno tem acesso a uma formação
                  integralmente católica.
                </span>
              </li>
              <li>
                <span>
                  <b>Todos os meses</b>, uma missa é rezada por todos os nossos benfeitores.
                </span>
              </li>
            </ul>
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
