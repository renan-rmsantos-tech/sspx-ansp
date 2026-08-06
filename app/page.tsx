import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Reveal } from "./_landing/reveal";

export const metadata: Metadata = {
  title: "Arca Nossa Senhora da Providência — Bolsa de estudos",
  description:
    "A Arca Nossa Senhora da Providência mantém o Colégio São José e oferece bolsas de estudo a famílias que desejam uma formação católica para seus filhos.",
};

const styles = `
.ansp-landing {
  --bg:      oklch(97.5% 0.005 85);
  --surface: oklch(100% 0 0);
  --fg:      oklch(22% 0.06 250);
  --muted:   oklch(48% 0.03 250);
  --border:  oklch(90% 0.008 85);
  --accent:  oklch(25% 0.06 250);
  --navy-deep: oklch(20% 0.06 250);
  --gold:    oklch(72% 0.10 80);
  --cream:   oklch(92% 0.03 85);

  --font-display: 'Iowan Old Style', 'Charter', 'Palatino', Georgia, serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;

  --radius: 8px;
  --radius-lg: 12px;
  --maxw: 1120px;

  font: 16px/1.6 var(--font-body);
  color: var(--fg);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.ansp-landing *, .ansp-landing *::before, .ansp-landing *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ansp-landing a { color: inherit; }
html:has(.ansp-landing) { scroll-behavior: smooth; }

.ansp-landing .shell { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }

.ansp-landing .skip-link {
  position: absolute; top: -100%; left: 16px; z-index: 200;
  padding: 8px 16px; background: var(--accent); color: #fff;
  font: 550 13px/1 var(--font-body); border-radius: 0 0 6px 6px; text-decoration: none;
}
.ansp-landing .skip-link:focus { top: 0; }

.ansp-landing .kicker {
  font: 550 11px/1 var(--font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
}
.ansp-landing .kicker.on-light { color: oklch(58% 0.10 80); }

.ansp-landing .gold-divider { width: 48px; height: 2px; background: var(--gold); border: none; }

/* ══════════ NAV ══════════ */
.ansp-landing .nav {
  position: sticky; top: 0; z-index: 100;
  background: color-mix(in oklch, var(--accent) 96%, transparent);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid color-mix(in oklch, var(--gold) 22%, transparent);
}
.ansp-landing .nav .shell { display: flex; align-items: center; gap: 20px; height: 72px; transition: height .3s cubic-bezier(.34, 1.4, .64, 1); }
.ansp-landing .nav-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; margin-right: auto; }
.ansp-landing .nav-brand .seal {
  width: 40px; height: 40px; flex-shrink: 0;
  transition: width .3s cubic-bezier(.34, 1.4, .64, 1), height .3s cubic-bezier(.34, 1.4, .64, 1), filter .3s ease;
}
.ansp-landing .nav-brand .nb-text { display: flex; flex-direction: column; line-height: 1.1; }
.ansp-landing .nav-brand .nb-name { font: 600 15px/1.15 var(--font-display); color: oklch(95% 0.02 85); transition: font-size .3s cubic-bezier(.34, 1.4, .64, 1); }
.ansp-landing .nav-brand .nb-sub { font: 500 10px/1.3 var(--font-body); letter-spacing: 0.08em; text-transform: uppercase; color: oklch(74% 0.04 250); transition: font-size .3s cubic-bezier(.34, 1.4, .64, 1); }

.ansp-landing .nav:has(.nav-brand:hover) .shell,
.ansp-landing .nav:has(.nav-brand:focus-visible) .shell { height: 128px; }
.ansp-landing .nav:has(.nav-brand:hover) .seal,
.ansp-landing .nav:has(.nav-brand:focus-visible) .seal { width: 72px; height: 72px; filter: drop-shadow(0 8px 20px rgba(0, 0, 0, .45)); }
.ansp-landing .nav:has(.nav-brand:hover) .nb-name,
.ansp-landing .nav:has(.nav-brand:focus-visible) .nb-name { font-size: 27px; }
.ansp-landing .nav:has(.nav-brand:hover) .nb-sub,
.ansp-landing .nav:has(.nav-brand:focus-visible) .nb-sub { font-size: 17px; }
.ansp-landing .nav-links { display: flex; gap: 28px; }
.ansp-landing .nav-links a {
  font: 500 14px/1 var(--font-body); letter-spacing: 0.01em;
  color: oklch(82% 0.03 250); text-decoration: none; padding: 6px 0;
  border-bottom: 1.5px solid transparent; transition: color .15s, border-color .15s;
}
.ansp-landing .nav-links a:hover { color: #fff; border-color: var(--gold); }
.ansp-landing .nav-cta {
  font: 550 13px/1 var(--font-body); letter-spacing: 0.02em;
  background: var(--gold); color: var(--navy-deep);
  padding: 10px 18px; border-radius: 6px; text-decoration: none;
  transition: filter .15s, transform .1s;
}
.ansp-landing .nav-cta:hover { filter: brightness(1.06); }
.ansp-landing .nav-cta:active { transform: translateY(1px); }
@media (max-width: 760px) {
  .ansp-landing .nav-links { display: none; }
  .ansp-landing .nav .shell { gap: 12px; height: 64px; }
  .ansp-landing .nav-brand { gap: 10px; }
  .ansp-landing .nav-brand .seal { width: 34px; height: 34px; }
  .ansp-landing .nav-brand .nb-name { font-size: 13px; }
  .ansp-landing .nav-brand .nb-sub { font-size: 9px; }
  .ansp-landing .nav-cta { padding: 9px 14px; font-size: 12px; white-space: nowrap; flex-shrink: 0; }
  .ansp-landing .nav:has(.nav-brand:hover) .shell,
  .ansp-landing .nav:has(.nav-brand:focus-visible) .shell { height: 64px; }
  .ansp-landing .nav:has(.nav-brand:hover) .seal,
  .ansp-landing .nav:has(.nav-brand:focus-visible) .seal { width: 34px; height: 34px; filter: none; }
  .ansp-landing .nav:has(.nav-brand:hover) .nb-name,
  .ansp-landing .nav:has(.nav-brand:focus-visible) .nb-name { font-size: 13px; }
  .ansp-landing .nav:has(.nav-brand:hover) .nb-sub,
  .ansp-landing .nav:has(.nav-brand:focus-visible) .nb-sub { font-size: 9px; }
}

/* ══════════ HERO ══════════ */
.ansp-landing .hero {
  position: relative;
  background:
    radial-gradient(120% 80% at 50% -10%, oklch(28% 0.06 250) 0%, var(--accent) 45%, var(--navy-deep) 100%);
  color: #fff; overflow: hidden;
}
.ansp-landing .hero::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.ansp-landing .hero .shell {
  display: grid; grid-template-columns: 1fr auto; gap: 64px; align-items: center;
  padding: 96px 24px 104px;
}
.ansp-landing .hero-copy { max-width: 580px; }
.ansp-landing .hero h1 {
  font: 600 clamp(40px, 6vw, 64px)/1.08 var(--font-display);
  letter-spacing: -0.02em; margin: 20px 0 18px;
  color: oklch(97% 0.02 85); text-wrap: balance;
}
.ansp-landing .hero h1 em { font-style: italic; color: var(--gold); }
.ansp-landing .hero p {
  font: 400 18px/1.6 var(--font-body); color: oklch(85% 0.025 250);
  max-width: 52ch; margin-bottom: 36px; text-wrap: pretty;
}
.ansp-landing .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; }
.ansp-landing .btn {
  display: inline-flex; align-items: center; gap: 9px;
  font: 550 15px/1 var(--font-body); letter-spacing: 0.01em;
  padding: 15px 28px; border-radius: 7px; text-decoration: none; border: 1.5px solid transparent;
  cursor: pointer; transition: filter .15s, transform .1s, background .15s, border-color .15s;
}
.ansp-landing .btn:active { transform: translateY(1px); }
.ansp-landing .btn-gold { background: var(--gold); color: var(--navy-deep); }
.ansp-landing .btn-gold:hover { filter: brightness(1.06); }
.ansp-landing .btn-ghost { color: oklch(90% 0.02 85); border-color: oklch(60% 0.04 250); }
.ansp-landing .btn-ghost:hover { border-color: var(--gold); color: #fff; }
.ansp-landing .btn svg { width: 17px; height: 17px; }

/* Hero seal — full ANSP mark on the navy gradient */
.ansp-landing .hero-seal { position: relative; display: grid; place-items: center; }
.ansp-landing .hero-seal::before {
  content: ""; position: absolute; width: 116%; height: 116%; border-radius: 50%;
  background: radial-gradient(closest-side, oklch(72% 0.10 80 / .18) 0%, transparent 72%);
}
.ansp-landing .hero-seal .seal {
  position: relative; width: 300px; height: 300px;
  filter: drop-shadow(0 20px 44px rgba(0, 0, 0, .45));
}

@media (max-width: 880px) {
  .ansp-landing .hero .shell { grid-template-columns: 1fr; gap: 28px; padding: 64px 24px 84px; text-align: center; }
  .ansp-landing .hero-copy { max-width: none; }
  .ansp-landing .hero p { margin-left: auto; margin-right: auto; }
  .ansp-landing .hero-actions { justify-content: center; }
  .ansp-landing .hero-seal { order: -1; }
  .ansp-landing .hero-seal .seal { width: min(220px, 60vw); height: auto; aspect-ratio: 1; }
}

/* ══════════ SECTION SCAFFOLD ══════════ */
.ansp-landing section { scroll-margin-top: 84px; }
.ansp-landing .section { padding: 96px 0; }
.ansp-landing .section-head { max-width: 640px; margin-bottom: 48px; }
.ansp-landing .section-head .gold-divider { margin: 14px 0 22px; }
.ansp-landing .section-head h2 {
  font: 600 clamp(28px, 4vw, 40px)/1.12 var(--font-display);
  letter-spacing: -0.015em; color: var(--accent); text-wrap: balance;
}

/* ── Missão (Quem somos) ── */
.ansp-landing .missao { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.ansp-landing .missao .grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 64px; align-items: start; }
.ansp-landing .missao .grid-single { grid-template-columns: 1fr; max-width: 760px; margin: 0 auto; }
.ansp-landing .missao .lede { font: 400 19px/1.65 var(--font-body); color: var(--fg); margin-bottom: 20px; text-wrap: pretty; }
.ansp-landing .missao p { color: var(--muted); margin-bottom: 16px; max-width: 60ch; }
.ansp-landing .missao p:last-child { margin-bottom: 0; }
.ansp-landing .missao em { color: var(--accent); font-style: italic; }
.ansp-landing .missao .pull {
  margin: 24px 0; padding: 18px 26px;
  border-left: 3px solid var(--gold); background: var(--cream);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.ansp-landing .missao .pull blockquote { font: italic 400 19px/1.55 var(--font-display); color: var(--accent); text-wrap: pretty; }
.ansp-landing .missao .pull cite { display: block; margin-top: 12px; font: 550 11px/1 var(--font-body); letter-spacing: 0.1em; text-transform: uppercase; color: oklch(58% 0.10 80); font-style: normal; }
.ansp-landing .missao .closing { margin-top: 24px; font: 600 19px/1.45 var(--font-display); color: var(--accent); text-wrap: balance; }
/* Devotional card — painting paired with scripture (santinho) */
.ansp-landing .devocional {
  margin: 28px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 26px; align-items: center;
  padding: 24px; background: var(--cream); border: 1px solid var(--border); border-radius: var(--radius-lg);
}
.ansp-landing .devocional-frame {
  flex-shrink: 0; display: block; width: 116px; padding: 10px;
  background: var(--surface); border: 1px solid color-mix(in oklch, var(--gold) 38%, var(--border));
  border-radius: var(--radius);
}
.ansp-landing .devocional-frame img { display: block; width: 100%; height: auto; }
.ansp-landing .devocional-text blockquote { font: italic 400 17px/1.55 var(--font-display); color: var(--accent); text-wrap: pretty; }
.ansp-landing .devocional-text cite { display: block; margin-top: 10px; font: 550 11px/1 var(--font-body); letter-spacing: 0.1em; text-transform: uppercase; color: oklch(58% 0.10 80); font-style: normal; }
@media (max-width: 460px) { .ansp-landing .devocional { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 18px; } }
@media (max-width: 880px) { .ansp-landing .missao .grid { grid-template-columns: 1fr; gap: 40px; } }

/* ── Solicitação (CTA band) ── */
.ansp-landing .solicitar { background: var(--accent); color: #fff; position: relative; overflow: hidden; }
.ansp-landing .solicitar::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(80% 120% at 85% 20%, oklch(30% 0.06 250) 0%, transparent 55%);
}
.ansp-landing .solicitar .shell { position: relative; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 56px; align-items: center; padding: 84px 24px; }
.ansp-landing .solicitar .kicker { color: var(--gold); }
.ansp-landing .solicitar h2 { font: 600 clamp(28px, 4vw, 38px)/1.14 var(--font-display); letter-spacing: -0.015em; color: oklch(97% 0.02 85); margin: 14px 0 18px; text-wrap: balance; }
.ansp-landing .solicitar p { font: 400 17px/1.65 var(--font-body); color: oklch(84% 0.025 250); max-width: 52ch; }
.ansp-landing .solicitar-actions { display: flex; flex-direction: column; gap: 16px; }
.ansp-landing .solicitar .btn-gold { justify-content: center; font-size: 16px; padding: 18px 28px; }
.ansp-landing .solicitar .steps { display: flex; flex-direction: column; gap: 10px; }
.ansp-landing .solicitar .step { display: flex; gap: 12px; align-items: baseline; font: 400 14px/1.5 var(--font-body); color: oklch(80% 0.03 250); }
.ansp-landing .solicitar .step b { font: 550 13px/1 var(--font-mono); color: var(--gold); }
@media (max-width: 880px) { .ansp-landing .solicitar .shell { grid-template-columns: 1fr; gap: 36px; padding: 64px 24px; } }

/* ── Seja um benfeitor (CTA band) ── */
.ansp-landing .benfeitor-band { background: var(--cream); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.ansp-landing .benfeitor-band .shell { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 56px; align-items: center; padding: 80px 24px; }
.ansp-landing .benfeitor-band h2 { font: 600 clamp(26px, 4vw, 36px)/1.14 var(--font-display); letter-spacing: -0.015em; color: var(--accent); margin: 14px 0 16px; text-wrap: balance; }
.ansp-landing .benfeitor-band p { font: 400 17px/1.65 var(--font-body); color: var(--muted); max-width: 54ch; }
.ansp-landing .benfeitor-actions { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.ansp-landing .benfeitor-actions .btn-gold { justify-content: center; font-size: 16px; padding: 16px 28px; }
.ansp-landing .benfeitor-note { font: 400 13.5px/1.55 var(--font-body); color: var(--muted); max-width: 40ch; }
@media (max-width: 880px) { .ansp-landing .benfeitor-band .shell { grid-template-columns: 1fr; gap: 32px; padding: 60px 24px; } }

/* ── Contato ── */
.ansp-landing .contato { background: var(--surface); border-top: 1px solid var(--border); }
.ansp-landing .contato-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 8px; }
.ansp-landing .contato-grid-single { grid-template-columns: 1fr; max-width: 420px; }
.ansp-landing .ci { padding: 28px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg); }
.ansp-landing .ci .ic { width: 22px; height: 22px; color: oklch(58% 0.10 80); margin-bottom: 14px; }
.ansp-landing .ci .ic svg { width: 100%; height: 100%; }
.ansp-landing .ci .lbl { font: 550 11px/1 var(--font-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.ansp-landing .ci .val { font: 400 15px/1.55 var(--font-body); color: var(--fg); }
.ansp-landing .ci .val a { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--border); }
.ansp-landing .ci .val a:hover { border-color: var(--gold); }
@media (max-width: 760px) { .ansp-landing .contato-grid { grid-template-columns: 1fr; } }

/* ══════════ FOOTER ══════════ */
.ansp-landing .footer { background: var(--navy-deep); color: oklch(80% 0.03 250); padding: 64px 0 40px; }
.ansp-landing .footer-top { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 48px; padding-bottom: 40px; border-bottom: 1px solid oklch(34% 0.04 250); }
.ansp-landing .footer-brand { display: flex; gap: 16px; align-items: flex-start; }
.ansp-landing .footer-brand .seal { width: 56px; height: 56px; flex-shrink: 0; }
.ansp-landing .footer-brand .fb-name { font: 600 18px/1.2 var(--font-display); color: oklch(95% 0.02 85); margin-bottom: 6px; }
.ansp-landing .footer-brand .fb-desc { font: 400 13.5px/1.6 var(--font-body); color: oklch(72% 0.03 250); max-width: 38ch; }
.ansp-landing .footer-col h4 { font: 550 11px/1 var(--font-body); letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); margin-bottom: 18px; }
.ansp-landing .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 11px; }
.ansp-landing .footer-col a { font: 400 14px/1.4 var(--font-body); color: oklch(80% 0.03 250); text-decoration: none; }
.ansp-landing .footer-col a:hover { color: #fff; }

/* FSSPX block */
.ansp-landing .fsspx { display: flex; align-items: center; gap: 16px; padding-top: 32px; }
.ansp-landing .fsspx-logo { width: 72px; height: 72px; flex-shrink: 0; display: grid; place-items: center; }
.ansp-landing .fsspx-logo img { width: 100%; height: 100%; object-fit: contain; display: block; }
.ansp-landing .fsspx-text .fsspx-name { font: 600 14px/1.3 var(--font-display); color: oklch(92% 0.02 85); }
.ansp-landing .fsspx-text .fsspx-sub { font: 400 12px/1.5 var(--font-body); color: oklch(70% 0.03 250); max-width: 44ch; margin-top: 3px; }

.ansp-landing .footer-bottom { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding-top: 28px; }
.ansp-landing .footer-bottom p { font: 400 12.5px/1.5 var(--font-body); color: oklch(64% 0.03 250); }
.ansp-landing .footer-bottom .legal a { color: oklch(74% 0.03 250); text-decoration: none; }
.ansp-landing .footer-bottom .legal a:hover { color: var(--gold); }

@media (max-width: 880px) { .ansp-landing .footer-top { grid-template-columns: 1fr; gap: 36px; } }

/* ══════════ MOTION ══════════ */
/* Reveals enhance an already-visible default: the .in class only adds a one-shot entrance. */
.ansp-landing .reveal.in {
  animation: ansp-revealIn .7s cubic-bezier(.22, 1, .36, 1) both;
  animation-delay: calc(var(--i, 0) * 70ms);
}
@keyframes ansp-revealIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

/* Hero load choreography — pure CSS, plays on first paint */
.ansp-landing .hero-copy > * { animation: ansp-heroIn .8s cubic-bezier(.22, 1, .36, 1) both; }
.ansp-landing .hero-copy > *:nth-child(1) { animation-delay: .06s; }
.ansp-landing .hero-copy > *:nth-child(2) { animation-delay: .15s; }
.ansp-landing .hero-copy > *:nth-child(3) { animation-delay: .24s; }
.ansp-landing .hero-copy > *:nth-child(4) { animation-delay: .33s; }
.ansp-landing .hero-seal { animation: ansp-heroFig 1s cubic-bezier(.22, 1, .36, 1) .22s both; }
@keyframes ansp-heroIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes ansp-heroFig { from { opacity: 0; transform: translateY(24px) scale(.97); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  html:has(.ansp-landing) { scroll-behavior: auto; }
  .ansp-landing *, .ansp-landing *::before, .ansp-landing *::after { transition-duration: .01ms !important; animation: none !important; }
  .ansp-landing .reveal, .ansp-landing .hero-copy > *, .ansp-landing .hero-seal { opacity: 1 !important; transform: none !important; }
}
`;

const arrowIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function LandingPage() {
  return (
    <div className="ansp-landing">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <a href="#missao" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Reusable seal symbol */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <clipPath id="seal-clip" clipPathUnits="userSpaceOnUse">
            <circle cx="110" cy="110" r="84" />
          </clipPath>
          <radialGradient id="seal-navy" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#1e2a4a" />
            <stop offset="100%" stopColor="#0f1729" />
          </radialGradient>
          <g id="seal-art">
            <circle cx="110" cy="110" r="106" fill="url(#seal-navy)" stroke="#c9a84c" strokeWidth="3" />
            <circle cx="110" cy="110" r="98" fill="none" stroke="#c9a84c" strokeWidth="0.6" opacity="0.35" />
            <image
              href="/base1.png"
              x="22"
              y="30"
              width="176"
              height="184"
              clipPath="url(#seal-clip)"
              preserveAspectRatio="xMidYMid slice"
            />
            <circle cx="110" cy="110" r="84" fill="none" stroke="#0f1729" strokeWidth="12" opacity="0.2" />
            <path id="seal-arc-top" d="M 18,110 a 92,92 0 0,1 184,0" fill="none" />
            <text
              fill="#c9a84c"
              fontFamily="'Iowan Old Style','Charter','Palatino',Georgia,serif"
              fontSize="12.5"
              fontWeight="700"
              letterSpacing="0.18em"
            >
              <textPath href="#seal-arc-top" startOffset="50%" textAnchor="middle">
                ARCA
              </textPath>
            </text>
            <path id="seal-arc-bottom" d="M 20,118 a 90,90 0 0,0 180,0" fill="none" />
            <text
              fill="#c9a84c"
              fontFamily="'Iowan Old Style','Charter','Palatino',Georgia,serif"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.14em"
            >
              <textPath href="#seal-arc-bottom" startOffset="50%" textAnchor="middle">
                N. S. DA PROVIDÊNCIA
              </textPath>
            </text>
          </g>
        </defs>
      </svg>

      {/* ══════════ NAV ══════════ */}
      <header className="nav">
        <div className="shell">
          <a href="#topo" className="nav-brand" aria-label="Arca Nossa Senhora da Providência — início">
            <svg className="seal" viewBox="0 0 220 220" role="img" aria-label="Selo da Arca">
              <use href="#seal-art" />
            </svg>
            <span className="nb-text">
              <span className="nb-name">Arca N. S. da Providência</span>
              <span className="nb-sub">Mantenedora · FSSPX</span>
            </span>
          </a>
          <nav className="nav-links" aria-label="Navegação principal">
            <a href="#missao">Quem somos</a>
            <a href="#solicitar">Solicitar bolsa</a>
            <a href="/benfeitor">Seja um benfeitor</a>
            <a href="#contato">Contato</a>
          </nav>
          <a href="/form" className="nav-cta">
            Solicitar bolsa
          </a>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="hero" id="topo">
        <div className="shell">
          <div className="hero-copy">
            <span className="kicker">Obra de assistência educacional católica</span>
            <h1>
              Educar para a Eternidade, sob o manto da <em>Providência</em>.
            </h1>
            <p>
              A Arca Nossa Senhora da Providência estende as mãos às famílias católicas que desejam, para
              seus filhos, uma formação verdadeiramente católica — abandonadas, em tudo, à Santa Vontade de
              Deus.
            </p>
            <div className="hero-actions">
              <a href="/form" className="btn btn-gold">
                Faça sua solicitação de bolsa
                {arrowIcon}
              </a>
              <a href="#missao" className="btn btn-ghost">
                Conheça a Arca
              </a>
            </div>
          </div>
          <div className="hero-seal">
            <svg
              className="seal"
              viewBox="0 0 220 220"
              role="img"
              aria-label="Selo da Arca Nossa Senhora da Providência"
            >
              <use href="#seal-art" />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════ MISSÃO — Quem somos ══════════ */}
      <section className="section missao" id="missao">
        <div className="shell">
          <div className="grid grid-single">
            <div>
              <div className="section-head" style={{ marginBottom: 28 }}>
                <span className="kicker on-light">Quem somos</span>
                <hr className="gold-divider" />
                <h2>Educando para a Eternidade, sob o Manto da Providência Divina</h2>
              </div>
              <p className="lede">
                Conscientes de que o fim do homem não é outro senão a vida eterna, e de que a formação
                católica tem por meta única proporcionar à alma os meios para alcançar a salvação, abraçamos
                com fidelidade a máxima do Papa <em>Pio XI</em> em sua encíclica <em>Divini Illius Magistri</em>:
              </p>
              <figure className="pull">
                <blockquote>
                  “O fim próprio e imediato da educação cristã é cooperar com a graça divina na formação do
                  verdadeiro e perfeito cristão.”
                </blockquote>
                <cite>Pio XI · Divini Illius Magistri</cite>
              </figure>
              <p>
                A Arca Nossa Senhora da Providência nasce com o firme propósito de estender as mãos às
                famílias católicas que buscam este grande e indispensável bem para os seus filhos. Sabemos
                que, nos dias de hoje, os desafios para oferecer uma educação verdadeiramente tradicional e
                livre dos erros do mundo são imensos — tanto no combate espiritual quanto no aspecto
                financeiro.
              </p>
              <p>
                Compreendendo o sacrifício e o preço desta formação, nossa missão é viabilizar bolsas de
                estudo para aquelas famílias que, inteiramente abandonadas à Santa Vontade de Deus, não medem
                esforços para cumprir o grave dever imposto pelo Magistério:
              </p>
              <figure className="pull">
                <blockquote>
                  “De nenhum modo se pode admitir uma educação que não seja inteiramente cristã.”
                </blockquote>
                <cite>Pio XI</cite>
              </figure>
              <p>
                Como o próprio nome indica, nossa obra é fruto do sacrifício, da resignação e da confiança na
                Providência Divina, que nunca desampara os seus eleitos.
              </p>
              <p>
                A Arca Nossa Senhora da Providência está estreitamente ligada ao apostolado da{" "}
                <em>Fraternidade Sacerdotal São Pio X</em> (FSSPX). Buscamos, de modo especial — mas não
                exclusivo —, amparar as famílias que se submetem a este santo apostolado e que desejam
                confiar a formação intelectual, moral e espiritual de seus filhos às escolas e priorados da
                Fraternidade.
              </p>
              <p className="closing">Ajudar a formar as almas de hoje é garantir os santos de amanhã.</p>
              <figure className="devocional reveal">
                <span className="devocional-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/base2.png"
                    alt="Nossa Senhora segurando o Menino Jesus — pintura clássica de devoção mariana."
                  />
                </span>
                <div className="devocional-text">
                  <blockquote>
                    “Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão dadas
                    por acréscimo.”
                  </blockquote>
                  <cite>Mt 6, 33</cite>
                </div>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SOLICITAR — CTA ══════════ */}
      <section className="solicitar" id="solicitar">
        <div className="shell">
          <div>
            <span className="kicker">Faça sua solicitação</span>
            <h2>Peça sua bolsa de estudos</h2>
            <p>
              Se a sua família busca este grande e indispensável bem para os seus filhos, preencha o
              formulário com os dados do responsável, dos alunos e a situação financeira. Confiando na
              Providência, a comissão avaliadora analisa cada pedido com cuidado e responde dentro do prazo
              informado.
            </p>
          </div>
          <div className="solicitar-actions">
            <a href="/form" className="btn btn-gold">
              Abrir formulário de solicitação
              {arrowIcon}
            </a>
            <div className="steps">
              <div className="step">
                <b>01</b> Preencha os dados da família e dos alunos
              </div>
              <div className="step">
                <b>02</b> Anexe a documentação solicitada
              </div>
              <div className="step">
                <b>03</b> Aguarde a análise da comissão avaliadora
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ BENFEITOR — CTA ══════════ */}
      <section className="benfeitor-band" id="benfeitor">
        <div className="shell">
          <div>
            <span className="kicker on-light">Seja um benfeitor</span>
            <h2>Sustente a formação católica de um aluno</h2>
            <p>
              A cada 15 pessoas que doam apenas R$ 80,00 por mês, um aluno tem acesso a uma formação
              integralmente católica. Todos os meses, uma missa é rezada por todos os nossos benfeitores.
            </p>
          </div>
          <div className="benfeitor-actions">
            <a href="/benfeitor" className="btn btn-gold">
              Quero ser benfeitor
              {arrowIcon}
            </a>
            <p className="benfeitor-note">
              Por nosso compromisso de garantir a bolsa do ano escolar completo, preferimos doações
              regulares.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════ CONTATO ══════════ */}
      <section className="section contato" id="contato">
        <div className="shell">
          <div className="section-head">
            <span className="kicker on-light">Contato</span>
            <hr className="gold-divider" />
            <h2>Onde nos encontrar</h2>
          </div>
          <div className="contato-grid contato-grid-single">
            <div className="ci reveal" style={{ "--i": 0 } as CSSProperties}>
              <div className="ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16v14H4z" />
                  <path d="M4 7l8 6 8-6" />
                </svg>
              </div>
              <div className="lbl">E-mail</div>
              <div className="val">
                <a href="mailto:contato@arcaprovidencia.org">contato@arcaprovidencia.org</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="footer">
        <div className="shell">
          <div className="footer-top">
            <div>
              <div className="footer-brand">
                <svg className="seal" viewBox="0 0 220 220" role="img" aria-label="Selo da Arca">
                  <use href="#seal-art" />
                </svg>
                <div>
                  <div className="fb-name">Arca Nossa Senhora da Providência</div>
                  <p className="fb-desc">
                    Associação de assistência educacional católica, dedicada à formação cristã das famílias
                    segundo a tradição da Igreja.
                  </p>
                </div>
              </div>
            </div>
            <div className="footer-col">
              <h4>Navegação</h4>
              <ul>
                <li><a href="#missao">Quem somos</a></li>
                <li><a href="#solicitar">Solicitar bolsa</a></li>
                <li><a href="/benfeitor">Seja um benfeitor</a></li>
                <li><a href="#contato">Contato</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Solicitações</h4>
              <ul>
                <li><a href="/form">Formulário de bolsa</a></li>
                <li><a href="/benfeitor">Seja um benfeitor</a></li>
                <li><a href="/admin">Área administrativa</a></li>
              </ul>
            </div>
          </div>

          {/* FSSPX */}
          <div className="fsspx">
            <div className="fsspx-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mqjmgzod-logo.png" alt="Fraternidade Sacerdotal São Pio X (FSSPX)" />
            </div>
            <div className="fsspx-text">
              <div className="fsspx-name">Fraternidade Sacerdotal São Pio X</div>
              <div className="fsspx-sub">Orientação espiritual da Arca Nossa Senhora da Providência.</div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Arca Nossa Senhora da Providência. Todos os direitos reservados.</p>
            <p className="legal">
              <a href="#topo">Voltar ao topo ↑</a>
            </p>
          </div>
        </div>
      </footer>

      <Reveal />
    </div>
  );
}
