import type { NextConfig } from "next";

// Protótipos de design (docs/design/prototyping.md) vivem em
// app/prototipos/**/page.proto.tsx. A extensão só é reconhecida fora de
// produção, então `next build` não gera essas rotas.
const isProduction = process.env.NODE_ENV === "production";
const pageExtensions = ["tsx", "ts", "jsx", "js"];
if (!isProduction) pageExtensions.push("proto.tsx");

const nextConfig: NextConfig = {
  pageExtensions,
  // Rotas antigas do painel (redesenho de 2026-10): redirect permanente para
  // as páginas novas e com abas. Parâmetros de consulta (ex.: `?month=`) são
  // repassados. O proxy.ts continua exigindo sessão antes do redirect.
  async redirects() {
    return [
      { source: "/admin/conferencia-pagamentos", destination: "/admin/pagamentos", permanent: true },
      { source: "/admin/conferencia-pagamentos/export", destination: "/admin/pagamentos/export", permanent: true },
      { source: "/admin/relatorios/cadastros", destination: "/admin/relatorios?aba=cadastros", permanent: true },
      { source: "/admin/relatorios/financeiro", destination: "/admin/relatorios?aba=financeiro", permanent: true },
      { source: "/admin/email-benfeitores", destination: "/admin/emails", permanent: true },
      { source: "/admin/instrucoes-benfeitores", destination: "/admin/emails?aba=instrucoes", permanent: true },
      { source: "/admin/lembretes-benfeitores", destination: "/admin/emails?aba=lembretes", permanent: true },
      { source: "/admin/textos", destination: "/admin/modelos", permanent: true },
      { source: "/admin/contrato", destination: "/admin/modelos?aba=contrato", permanent: true },
    ];
  },
  async headers() {
    return [{
      source: "/benfeitor/comprovante",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }];
  },
  // @react-pdf/renderer (e suas dependências de fonte/pdfkit) deve rodar no
  // Node das Server Actions sem ser empacotado pelo bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
  // O armazenamento local resolve caminhos em tempo de execução. O Turbopack
  // 16.2 emite este diagnóstico genérico mesmo no deploy Docker, que não usa
  // output standalone. Mantemos o filtro limitado a esse aviso conhecido.
  turbopack: {
    ignoreIssue: [
      {
        path: "next.config.ts",
        title: "Encountered unexpected file in NFT list",
      },
    ],
  },
};

export default nextConfig;
