import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("redirects do painel administrativo", () => {
  // UT-100
  it("registra as seis rotas antigas como redirects permanentes", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual([
      { source: "/admin/conferencia-pagamentos", destination: "/admin/pagamentos", permanent: true },
      { source: "/admin/email-benfeitores", destination: "/admin/emails", permanent: true },
      { source: "/admin/instrucoes-benfeitores", destination: "/admin/emails?aba=instrucoes", permanent: true },
      { source: "/admin/lembretes-benfeitores", destination: "/admin/emails?aba=lembretes", permanent: true },
      { source: "/admin/textos", destination: "/admin/modelos", permanent: true },
      { source: "/admin/contrato", destination: "/admin/modelos?aba=contrato", permanent: true },
    ]);
    expect(redirects.every((redirect) => redirect.permanent)).toBe(true);
  });
});
