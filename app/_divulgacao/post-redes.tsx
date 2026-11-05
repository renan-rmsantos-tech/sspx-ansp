import { SealLogo } from "@/components/ui/seal-logo";
import { MOTTO, SITE_URL, materialTokens } from "./material";

export type PostTema = "benfeitores" | "familias";
export type PostFormato = "quadrado" | "story";

const styles = `
.ansp-post {
  margin: 0 auto; position: relative; overflow: hidden;
  background: var(--night); color: oklch(96% 0.01 85);
  display: flex; flex-direction: column; text-align: center;
}
.ansp-post::before {
  content: ""; position: absolute; inset: 28px;
  border: 2px solid oklch(72% 0.10 80 / 0.7); pointer-events: none;
}
.ansp-post.quadrado { width: 1080px; height: 1080px; padding: 96px 112px; }
.ansp-post.story { width: 1080px; height: 1920px; padding: 180px 112px 160px; }
.ansp-post .brand { display: grid; justify-items: center; gap: 20px; }
.ansp-post .brand img { display: block; }
.ansp-post .org { font: 600 22px/1 var(--font-body); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
.ansp-post .main { margin: auto 0; display: grid; gap: 36px; justify-items: center; }
.ansp-post .kicker { font: 600 24px/1 var(--font-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.ansp-post h1 { font: 600 76px/1.06 var(--font-display); letter-spacing: -0.01em; text-wrap: balance; color: oklch(98% 0.008 85); }
.ansp-post.story h1 { font-size: 92px; }
.ansp-post h1 em { font-style: italic; color: var(--gold); }
.ansp-post .rule { width: 120px; height: 3px; background: var(--gold); border: 0; }
.ansp-post .text { font: 400 34px/1.45 var(--font-body); color: oklch(88% 0.02 85); max-width: 26ch; text-wrap: pretty; }
.ansp-post .text b { color: oklch(98% 0.008 85); font-weight: 600; }
.ansp-post .steps { list-style: none; display: grid; gap: 22px; text-align: left; }
.ansp-post .steps li { display: grid; grid-template-columns: 72px 1fr; align-items: baseline; font: 500 34px/1.35 var(--font-body); color: oklch(92% 0.015 85); }
.ansp-post .steps b { font: 600 44px/1 var(--font-display); color: var(--gold); }
.ansp-post .cta {
  display: inline-block; background: var(--gold); color: #0f1729;
  font: 600 32px/1 var(--font-body); padding: 26px 40px; border-radius: 6px;
}
.ansp-post .motto { font: italic 400 30px/1.35 var(--font-display); color: oklch(88% 0.02 85); max-width: 28ch; margin: 0 auto; }
`;

/**
 * Post de redes sociais (quadrado 1080×1080 ou story 1080×1920) com os
 * textos da landing: o convite aos benfeitores ou o pedido de bolsa.
 */
export function PostRedes({ tema, formato }: { tema: PostTema; formato: PostFormato }) {
  return (
    <div className="ansp-material ansp-material-mesa">
      <style dangerouslySetInnerHTML={{ __html: materialTokens + styles }} />
      <main className={`ansp-post ${formato}`}>
        <div className="brand">
          <SealLogo size={formato === "story" ? 200 : 140} />
          <p className="org">Arca Nossa Senhora da Providência</p>
        </div>

        {tema === "benfeitores" ? (
          <div className="main">
            <span className="kicker">Seja um benfeitor</span>
            <h1>
              Sustente a formação católica de <em>um aluno</em>
            </h1>
            <hr className="rule" />
            <p className="text">
              A cada <b>15 pessoas</b> que doam apenas <b>R$ 80,00 por mês</b>, um aluno tem acesso a uma formação
              integralmente católica.
            </p>
            {formato === "story" && (
              <p className="text">Todos os meses, uma missa é rezada por todos os nossos benfeitores.</p>
            )}
            <span className="cta">{SITE_URL}</span>
          </div>
        ) : (
          <div className="main">
            <span className="kicker">Faça sua solicitação</span>
            <h1>
              Peça sua <em>bolsa de estudos</em>
            </h1>
            <hr className="rule" />
            <ol className="steps">
              <li><b>01</b><span>Preencha os dados da família e dos alunos</span></li>
              <li><b>02</b><span>Anexe a documentação solicitada</span></li>
              <li><b>03</b><span>Aguarde a análise da comissão avaliadora</span></li>
            </ol>
            <span className="cta">{SITE_URL}</span>
          </div>
        )}

        {formato === "story" && <p className="motto">“{MOTTO}”</p>}
      </main>
    </div>
  );
}
