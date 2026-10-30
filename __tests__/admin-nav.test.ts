import { describe, it, expect } from "vitest";
import { NAV, isActive, navForRole } from "@/app/admin/_components/nav";

function summarize(groups: ReturnType<typeof navForRole>) {
  return groups.map((group) => ({
    title: group.title,
    items: group.items.map((item) => [item.label, item.href]),
  }));
}

describe("NAV", () => {
  // UT-001
  it("lista os 4 grupos com todos os itens e hrefs para admin", () => {
    expect(summarize(navForRole("admin"))).toEqual([
      { title: undefined, items: [["Início", "/admin"]] },
      {
        title: "Bolsas",
        items: [
          ["Solicitações", "/admin/solicitacoes"],
          ["Ano letivo", "/admin/ano-letivo"],
        ],
      },
      {
        title: "Benfeitores",
        items: [
          ["Benfeitores", "/admin/benfeitores"],
          ["Pagamentos", "/admin/pagamentos"],
          ["E-mails", "/admin/emails"],
          ["Relatórios", "/admin/relatorios"],
        ],
      },
      {
        title: "Configurações",
        items: [
          ["Modelos de documentos", "/admin/modelos"],
          ["Cabeçalho e rodapé", "/admin/cabecalho"],
          ["Usuários", "/admin/usuarios"],
        ],
      },
    ]);
  });

  // UT-002
  it("mostra só Início, Solicitações e Benfeitores para secretaria, sem grupos vazios", () => {
    const groups = navForRole("secretaria");
    expect(groups.flatMap((group) => group.items.map((item) => item.label))).toEqual([
      "Início",
      "Solicitações",
      "Benfeitores",
    ]);
    expect(groups.map((group) => group.title)).toEqual([undefined, "Bolsas", "Benfeitores"]);
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
  });

  it("marca as chaves de badge em Solicitações e Benfeitores", () => {
    const items = NAV.flatMap((group) => group.items);
    expect(items.find((item) => item.id === "solicitacoes")?.badge).toBe("pendingApplications");
    expect(items.find((item) => item.id === "benfeitores")?.badge).toBe("pendingWelcome");
    expect(items.filter((item) => item.badge)).toHaveLength(2);
  });

  // UT-012 (parte de dados)
  it("não inclui o item Padrões visuais", () => {
    const labels = NAV.flatMap((group) => group.items.map((item) => item.label));
    expect(labels).not.toContain("Padrões visuais");
    expect(NAV.map((group) => group.title)).not.toContain("Referência");
  });

  it("tem ids e hrefs únicos", () => {
    const items = NAV.flatMap((group) => group.items);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });
});

describe("isActive", () => {
  // UT-003
  it("casa /admin só exato e os demais por prefixo", () => {
    expect(isActive("/admin/solicitacoes/x", "/admin/solicitacoes")).toBe(true);
    expect(isActive("/admin/solicitacoes", "/admin/solicitacoes")).toBe(true);
    expect(isActive("/admin/solicitacoes", "/admin")).toBe(false);
    expect(isActive("/admin", "/admin")).toBe(true);
  });

  it("não casa prefixo parcial de segmento", () => {
    expect(isActive("/admin/solicitacoes-arquivo", "/admin/solicitacoes")).toBe(false);
  });
});
