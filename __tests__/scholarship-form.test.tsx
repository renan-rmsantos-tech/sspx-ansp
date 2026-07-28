import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { ScholarshipForm } from "@/app/form/_components/scholarship-form";
import { SERIES_OPTIONS } from "@/app/form/_components/form-types";

const mockSubmitApplication = vi.fn();

vi.mock("@/app/form/_actions/form-actions", () => ({
  createUploadUrl: vi.fn().mockResolvedValue({
    url: "https://example.com/upload",
    path: "pending/abc/doc/file.pdf",
  }),
  submitApplication: (...args: unknown[]) => mockSubmitApplication(...args),
}));

async function uploadAll() {
  const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
  for (const input of screen.getAllByTestId("upload-input")) {
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
  }
}

async function fillStep1() {
  // Escola não é mais escolhida no formulário (valor padrão: Colégio São José).
  fireEvent.change(screen.getByTestId("pai-nome"), {
    target: { value: "João Silva" },
  });
  fireEvent.change(screen.getByTestId("pai-rg"), {
    target: { value: "12.345.678-9" },
  });
  fireEvent.change(screen.getByTestId("pai-cpf"), {
    target: { value: "529.982.247-25" },
  });
  fireEvent.change(screen.getByTestId("pai-profissao"), {
    target: { value: "Engenheiro" },
  });
  fireEvent.change(screen.getByTestId("mae-nome"), {
    target: { value: "Maria Silva" },
  });
  fireEvent.change(screen.getByTestId("mae-cpf"), {
    target: { value: "529.982.247-25" },
  });
  fireEvent.change(screen.getByTestId("mae-profissao"), {
    target: { value: "Professora" },
  });
  fireEvent.change(screen.getByTestId("endereco"), {
    target: { value: "Rua A, 123" },
  });
  fireEvent.change(screen.getByTestId("cep"), {
    target: { value: "13250-000" },
  });
  fireEvent.change(screen.getByTestId("telefone"), {
    target: { value: "(11) 99999-9999" },
  });
  fireEvent.change(screen.getByTestId("email"), {
    target: { value: "joao@email.com" },
  });
  // Documentos obrigatórios do passo 1 (RG do pai/mãe, certidão, comprovante).
  await uploadAll();
}

async function fillStep2() {
  fireEvent.change(screen.getByTestId("aluno-nome-0"), {
    target: { value: "Pedro Silva" },
  });
  fireEvent.change(screen.getByTestId("aluno-cpf-0"), {
    target: { value: "529.982.247-25" },
  });
  fireEvent.change(screen.getByTestId("aluno-serie-0"), {
    target: { value: SERIES_OPTIONS[0] },
  });
  fireEvent.change(screen.getByTestId("aluno-mensalidade-0"), {
    target: { value: "1000" },
  });
  // Upload obrigatório: RG/CPF e certidão de nascimento do aluno.
  const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
  const uploads = screen.getAllByTestId("upload-input");
  for (const input of uploads) {
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
  }
  // desconto_solicitado já vem preenchido com "0".
}

async function fillStep3() {
  fireEvent.change(screen.getByTestId("pessoas-domicilio"), {
    target: { value: "4" },
  });
  // Upload obrigatório: extrato do Imposto de Renda.
  const file = new File(["x"], "ir.pdf", { type: "application/pdf" });
  await act(async () => {
    fireEvent.change(screen.getByTestId("upload-input"), {
      target: { files: [file] },
    });
  });
}

async function fillStep4() {
  // Upload obrigatório: ao menos um extrato bancário.
  const file = new File(["x"], "extrato.pdf", { type: "application/pdf" });
  await act(async () => {
    fireEvent.change(screen.getByTestId("upload-input"), {
      target: { files: [file] },
    });
  });
}

function fillStep5() {
  // As 10 indicações de benfeitores são obrigatórias (nome + e-mail válido).
  for (let i = 0; i < 10; i++) {
    fireEvent.change(screen.getByTestId(`benfeitor-nome-${i}`), {
      target: { value: `Benfeitor ${i + 1}` },
    });
    fireEvent.change(screen.getByTestId(`benfeitor-email-${i}`), {
      target: { value: `benfeitor${i + 1}@exemplo.com` },
    });
  }
}

async function navigateToStep(n: number) {
  await fillStep1();
  fireEvent.click(screen.getByTestId("btn-next"));
  if (n <= 2) return;
  await fillStep2();
  fireEvent.click(screen.getByTestId("btn-next"));
  if (n <= 3) return;
  await fillStep3();
  fireEvent.click(screen.getByTestId("btn-next"));
  if (n <= 4) return;
  await fillStep4();
  fireEvent.click(screen.getByTestId("btn-next"));
  if (n <= 5) return;
  fillStep5();
  fireEvent.click(screen.getByTestId("btn-next"));
}

describe("ScholarshipForm", () => {
  beforeEach(() => {
    mockSubmitApplication.mockReset();
    // Uploads dos documentos do aluno usam fetch (PUT no storage).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response)
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders step 1 initially with progress bar at step 1", () => {
    render(<ScholarshipForm />);
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getByText("1. Dados dos Pais")).toBeInTheDocument();
    expect(screen.getByText("Etapa 1 de 6")).toBeInTheDocument();
  });

  it("validates step 1 required fields before allowing next", () => {
    render(<ScholarshipForm />);
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getAllByText("Campo obrigatório").length).toBeGreaterThan(0);
  });

  it("advances to step 2 when step 1 is valid", async () => {
    render(<ScholarshipForm />);
    await fillStep1();
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-2")).toBeInTheDocument();
  });

  it("step 1 dynamic add/remove for other children", () => {
    render(<ScholarshipForm />);
    expect(screen.queryByTestId("remove-child")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("add-child"));
    expect(screen.getByTestId("remove-child")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("remove-child"));
    expect(screen.queryByTestId("remove-child")).not.toBeInTheDocument();
  });

  it("step 2 auto-calculates total tuition from student mensalidade values", async () => {
    render(<ScholarshipForm />);
    await fillStep1();
    fireEvent.click(screen.getByTestId("btn-next"));

    fireEvent.change(screen.getByTestId("aluno-mensalidade-0"), {
      target: { value: "1500" },
    });
    expect(screen.getByTestId("total-sem")).toHaveTextContent("R$ 1500,00");
  });

  it("step 2 dynamic add/remove for students updates totals", async () => {
    render(<ScholarshipForm />);
    await fillStep1();
    fireEvent.click(screen.getByTestId("btn-next"));

    fireEvent.change(screen.getByTestId("aluno-mensalidade-0"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByTestId("add-student"));
    fireEvent.change(screen.getByTestId("aluno-mensalidade-1"), {
      target: { value: "800" },
    });
    expect(screen.getByTestId("total-sem")).toHaveTextContent("R$ 1800,00");

    const removeButtons = screen.getAllByTestId("remove-student");
    fireEvent.click(removeButtons[1]);
    expect(screen.getByTestId("total-sem")).toHaveTextContent("R$ 1000,00");
  });

  it("step 3 auto-sums income fields", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(3);

    fireEvent.change(screen.getByTestId("renda-pai"), {
      target: { value: "3000" },
    });
    fireEvent.change(screen.getByTestId("renda-mae"), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByTestId("renda-outros"), {
      target: { value: "500" },
    });
    expect(screen.getByTestId("total-renda")).toHaveTextContent("R$ 5500,00");
  });

  it("step 4 auto-sums expense fields", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(4);

    fireEvent.change(screen.getByTestId("desp-aluguel"), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByTestId("desp-servicos"), {
      target: { value: "300" },
    });
    expect(screen.getByTestId("total-despesas")).toHaveTextContent(
      "R$ 1500,00"
    );
  });

  it("step 5 dynamic add/remove for vehicles", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(5);

    expect(screen.queryByTestId("remove-vehicle")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("add-vehicle"));
    expect(screen.getByTestId("remove-vehicle")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("remove-vehicle"));
    expect(screen.queryByTestId("remove-vehicle")).not.toBeInTheDocument();
  });

  it("step 6 renders read-only summary of all entered data", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(6);

    const summary = screen.getByTestId("review-summary");
    expect(summary).toHaveTextContent("Colégio São José");
    expect(summary).toHaveTextContent("João Silva");
    expect(summary).toHaveTextContent("Maria Silva");
    expect(summary).toHaveTextContent("Rua A, 123");
    expect(summary).toHaveTextContent("Pedro Silva");
  });

  it("step 6 blocks submission if legal declaration checkbox is unchecked", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(6);

    fireEvent.click(screen.getByTestId("btn-submit"));
    expect(screen.getByTestId("aceite-error")).toBeInTheDocument();
    expect(mockSubmitApplication).not.toHaveBeenCalled();
  });

  it("complete form flow: submit → success screen displayed", async () => {
    mockSubmitApplication.mockResolvedValue({ success: true, id: "test-id" });

    render(<ScholarshipForm />);
    await navigateToStep(6);

    fireEvent.click(screen.getByTestId("aceite-checkbox"));
    fireEvent.click(screen.getByTestId("btn-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("success-screen")).toBeInTheDocument();
    });
    expect(mockSubmitApplication).toHaveBeenCalledTimes(1);
  });

  it("step validation prevents advancing with missing required fields", async () => {
    render(<ScholarshipForm />);
    await fillStep1();
    fireEvent.click(screen.getByTestId("btn-next"));
    await fillStep2();
    fireEvent.click(screen.getByTestId("btn-next"));

    // Step 3 - try to advance without pessoas_domicilio
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-3")).toBeInTheDocument();
    expect(screen.getAllByText("Campo obrigatório").length).toBeGreaterThan(0);
  });

  it("step 1 requires profissão, CEP and a valid e-mail", async () => {
    render(<ScholarshipForm />);
    // advancing with everything empty stays on step 1
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getByTestId("pai-profissao")).toHaveClass("border-danger");
    expect(screen.getByTestId("mae-profissao")).toHaveClass("border-danger");
    expect(screen.getByTestId("cep")).toHaveClass("border-danger");

    // an invalid e-mail is rejected
    await fillStep1();
    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "nao-e-email" },
    });
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
  });

  it("step 1 requires nome, CPF and birth date for each other child", async () => {
    render(<ScholarshipForm />);
    await fillStep1();
    fireEvent.click(screen.getByTestId("add-child"));
    fireEvent.click(screen.getByTestId("btn-next"));

    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getByTestId("filho-nome-0")).toHaveClass("border-danger");

    // fill the child → advances
    fireEvent.change(screen.getByTestId("filho-nome-0"), {
      target: { value: "Lucas Silva" },
    });
    fireEvent.change(screen.getByTestId("filho-cpf-0"), {
      target: { value: "529.982.247-25" },
    });
    fireEvent.change(screen.getByTestId("filho-nascimento-0"), {
      target: { value: "2015-05-10" },
    });
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-2")).toBeInTheDocument();
  });

  it("step 5 blocks advancing until all 10 benefactors are filled", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(5);

    // Try to advance with no benefactors filled
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-5")).toBeInTheDocument();
    expect(screen.getByTestId("benfeitor-nome-0")).toHaveClass("border-danger");

    // Fill all 10 → advances to step 6
    fillStep5();
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-6")).toBeInTheDocument();
  });

  it("step 2 requires all student fields and documents, discount defaults to 0", async () => {
    render(<ScholarshipForm />);
    await fillStep1();
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-2")).toBeInTheDocument();

    // discount comes pre-filled with 0
    expect(screen.getByTestId("desconto-pct")).toHaveValue(0);

    // advancing with an empty student stays on step 2 with errors (incl. uploads)
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-2")).toBeInTheDocument();
    expect(screen.getByTestId("aluno-cpf-0")).toHaveClass("border-danger");
    expect(screen.getByTestId("aluno-serie-0")).toHaveClass("border-danger");
    expect(screen.getByTestId("aluno-mensalidade-0")).toHaveClass("border-danger");
    // mensagem padrão de obrigatoriedade aparece (inclui os uploads)
    expect(screen.getAllByText("Campo obrigatório").length).toBeGreaterThan(3);

    // fully filling the student (incl. uploads) lets it advance
    await fillStep2();
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-3")).toBeInTheDocument();
  });

  it("step 3 requires the income tax statement upload", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(3);

    // fill pessoas but leave the IR upload empty → stays on step 3
    fireEvent.change(screen.getByTestId("pessoas-domicilio"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-3")).toBeInTheDocument();
    expect(screen.getAllByText("Campo obrigatório").length).toBeGreaterThan(0);

    // upload the statement → advances to step 4
    const file = new File(["x"], "ir.pdf", { type: "application/pdf" });
    await act(async () => {
      fireEvent.change(screen.getByTestId("upload-input"), {
        target: { files: [file] },
      });
    });
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-4")).toBeInTheDocument();
  });

  it("step 4 requires a bank statement but not the expense amounts", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(4);

    // advancing without any bank statement (and no expense amounts) stays on step 4
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-4")).toBeInTheDocument();
    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument();

    // uploading a statement (expense amounts left blank) lets it advance
    await fillStep4();
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-5")).toBeInTheDocument();
  });

  it("step 5 requires marca, modelo and ano when a vehicle is added", async () => {
    render(<ScholarshipForm />);
    await navigateToStep(5);

    fillStep5();
    fireEvent.click(screen.getByTestId("add-vehicle"));
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-5")).toBeInTheDocument();
    expect(screen.getByTestId("veiculo-marca-0")).toHaveClass("border-danger");

    fireEvent.change(screen.getByTestId("veiculo-marca-0"), {
      target: { value: "Fiat" },
    });
    fireEvent.change(screen.getByTestId("veiculo-modelo-0"), {
      target: { value: "Uno" },
    });
    fireEvent.change(screen.getByTestId("veiculo-ano-0"), {
      target: { value: "2015" },
    });
    fireEvent.click(screen.getByTestId("btn-next"));
    expect(screen.getByTestId("step-6")).toBeInTheDocument();
  });

});
