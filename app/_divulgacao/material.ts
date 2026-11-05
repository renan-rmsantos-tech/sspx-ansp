/**
 * Base comum dos materiais de divulgação (cartazes e posts). Os tokens repetem
 * os da landing e do cartaz A4 original (`docs/design/cartaz-divulgacao/`);
 * cada material acrescenta o próprio CSS sob a sua classe.
 */
export const SITE_URL = "www.arcaprovidencia.com.br";
export const CONTACT_EMAIL = "contato@arcaprovidencia.com.br";
/** QR Code de `SITE_URL`, o mesmo do cartaz A4 impresso. */
export const SITE_QR_SRC = "/divulgacao/qrcode-site.svg";
export const FSSPX_LOGO_SRC = "/mqjmgzod-logo.png";
export const MOTTO = "Ajudar a formar as almas de hoje é garantir os santos de amanhã.";

export const materialTokens = `
.ansp-material {
  --bg: oklch(97.5% 0.005 85);
  --surface: oklch(100% 0 0);
  --fg: oklch(22% 0.06 250);
  --muted: oklch(42% 0.03 250);
  --border: oklch(88% 0.012 85);
  --accent: oklch(25% 0.06 250);
  --gold: oklch(72% 0.10 80);
  --gold-deep: oklch(52% 0.09 75);
  --cream: oklch(92% 0.03 85);
  --night: radial-gradient(120% 150% at 12% 0%, #1e2a4a 0%, #0f1729 72%);
  --font-display: "Iowan Old Style", "Charter", "Palatino", Georgia, serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  color: var(--fg);
  font-family: var(--font-body);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.ansp-material * { box-sizing: border-box; margin: 0; padding: 0; }
/* Mesa de revisão: fundo neutro em volta da peça; some na impressão. */
.ansp-material-mesa { background: oklch(86% 0.006 85); padding: 12mm 0; min-height: 100vh; }
@media print {
  .ansp-material-mesa { background: none; padding: 0; min-height: 0; }
}
`;
