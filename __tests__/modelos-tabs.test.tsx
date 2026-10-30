import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let mockSearch = "";
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/modelos",
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  saveTemplate: vi.fn(),
  saveContractTemplate: vi.fn(),
}));

import { ModelosTabs } from "@/app/admin/modelos/modelos-tabs";

const templates = [
  { id: "t-1", tipo: "aprovacao" as const, cabecalho: "Itatiba, {data}", corpo: "Aprovada para {aluno}", rodape: "Comissão" },
  { id: "t-2", tipo: "rejeicao" as const, cabecalho: "Itatiba, {data}", corpo: "Não foi possível para {aluno}", rodape: "Comissão" },
];
const contract = {
  id: "c-1",
  titulo: "CONTRATO DE BOLSA",
  cabecalho: "BENEFICIÁRIO: {aluno}",
  clausulas: [{ titulo: "CLÁUSULA PRIMEIRA", corpo: "Bolsa de {desconto}%" }],
  rodape: "{data_extenso}",
};

function show() {
  return render(<ModelosTabs templates={templates} contract={contract} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockSearch = "";
});

describe("ModelosTabs", () => {
  // UT-083
  it("começa na carta de aprovação e abre o contrato com ?aba=contrato", () => {
    const { unmount } = show();
    expect(screen.getByTestId("tab-aprovacao")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("field-corpo")).toHaveValue("Aprovada para {aluno}");
    expect(screen.queryByTestId("contract-template-editor")).not.toBeInTheDocument();
    unmount();

    mockSearch = "aba=contrato";
    show();
    expect(screen.getByTestId("tab-contrato")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("contract-template-editor")).toBeInTheDocument();
    expect(screen.getByTestId("field-titulo")).toHaveValue("CONTRATO DE BOLSA");
    expect(screen.queryByTestId("template-editor")).not.toBeInTheDocument();
  });

  // UT-084
  it("rotula as abas e troca para a carta de rejeição gravando a URL", () => {
    show();
    expect(screen.getByRole("tablist", { name: "Modelo" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-aprovacao").textContent).toBe("Carta de aprovação");
    expect(screen.getByTestId("tab-rejeicao").textContent).toBe("Carta de rejeição");
    expect(screen.getByTestId("tab-contrato").textContent).toBe("Contrato de concessão");

    fireEvent.click(screen.getByTestId("tab-rejeicao"));
    expect(mockReplace).toHaveBeenCalledWith("/admin/modelos?aba=rejeicao", { scroll: false });
    expect(screen.getByTestId("tab-rejeicao")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("field-corpo")).toHaveValue("Não foi possível para {aluno}");
    expect(screen.getAllByTestId("token-item")).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "Campos disponíveis" })).toBeInTheDocument();
  });
});
