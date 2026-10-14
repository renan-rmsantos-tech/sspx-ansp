import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";

const { lookupCep } = vi.hoisted(() => ({ lookupCep: vi.fn() }));

vi.mock("@/app/benfeitor/_actions/donor-actions", () => ({
  registerDonorPledge: vi.fn(),
}));

vi.mock("@/app/form/_components/file-upload", () => ({
  FileUpload: () => <div data-testid="file-upload" />,
}));

vi.mock("@/lib/cep/viacep", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cep/viacep")>()),
  lookupCep,
}));

describe("DonorForm", () => {
  afterEach(cleanup);

  it("suggests city and UF from ViaCEP and allows the donor to correct them", async () => {
    lookupCep.mockResolvedValueOnce({
      ok: true,
      address: { cep: "01001-000", logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" },
    });
    render(<DonorForm />);

    fireEvent.change(screen.getByTestId("donor-cep"), { target: { value: "01001000" } });
    fireEvent.blur(screen.getByTestId("donor-cep"));

    const city = await screen.findByLabelText("Cidade de residência");
    expect(city).toHaveValue("São Paulo");
    const state = screen.getByLabelText("Estado (UF)");
    expect(state).toHaveValue("SP");

    fireEvent.change(city, { target: { value: "Campinas" } });
    fireEvent.change(state, { target: { value: "RJ" } });
    expect(city).toHaveValue("Campinas");
    expect(state).toHaveValue("RJ");
    expect(screen.getByRole("checkbox", { name: /Confirmo que a cidade/ })).not.toBeChecked();
  });

  it("does not overwrite a residence correction made while ViaCEP is loading", async () => {
    let resolveLookup!: (value: {
      ok: true;
      address: { cep: string; logradouro: string; bairro: string; localidade: string; uf: string };
    }) => void;
    lookupCep.mockReturnValueOnce(new Promise((resolve) => { resolveLookup = resolve; }));
    render(<DonorForm />);

    fireEvent.change(screen.getByTestId("donor-cep"), { target: { value: "01001000" } });
    fireEvent.blur(screen.getByTestId("donor-cep"));
    fireEvent.change(screen.getByLabelText("Cidade de residência"), { target: { value: "Campinas" } });
    fireEvent.change(screen.getByLabelText("Estado (UF)"), { target: { value: "SP" } });
    resolveLookup({
      ok: true,
      address: { cep: "01001-000", logradouro: "", bairro: "", localidade: "São Paulo", uf: "SP" },
    });

    expect(await screen.findByLabelText("Cidade de residência")).toHaveValue("Campinas");
    expect(screen.getByLabelText("Estado (UF)")).toHaveValue("SP");
  });

  it("keeps residence fields editable when ViaCEP fails", async () => {
    lookupCep.mockResolvedValueOnce({ ok: false, error: "Não foi possível consultar o CEP. Tente novamente." });
    render(<DonorForm />);
    fireEvent.change(screen.getByTestId("donor-cep"), { target: { value: "01001000" } });
    fireEvent.blur(screen.getByTestId("donor-cep"));

    expect(await screen.findByText("Não foi possível consultar o CEP. Tente novamente.")).toBeInTheDocument();
    expect(screen.getByLabelText("Cidade de residência")).toBeEnabled();
    expect(screen.getByLabelText("Estado (UF)")).toBeEnabled();
  });

  it("shows the correct donation presets for each payment frequency", () => {
    render(<DonorForm />);

    expect(screen.getByRole("button", { name: "R$ 80" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 200" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "R$ 1.200 (1 bolsa)" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));

    expect(screen.getByRole("button", { name: "R$ 500" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 800" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "R$ 1.200 (1 bolsa mensal)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "R$ 14.400 (12 bolsas / 1 ano)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "R$ 80" })).not.toBeInTheDocument();
  });
});
