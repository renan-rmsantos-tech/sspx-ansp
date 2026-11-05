import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";
import { DonorPageLayout } from "@/app/benfeitor/_components/donor-page-layout";
import { DonorReceiptPageView } from "@/app/benfeitor/comprovante/receipt-shell";
import { ScholarshipForm } from "@/app/form/_components/scholarship-form";
import { ScholarshipPageLayout } from "@/app/form/_components/scholarship-page-layout";
import { MSG_OBRIGATORIO } from "@/app/form/_components/field-ui";
import { INITIAL_FORM_DATA } from "@/app/form/_components/form-types";
import { LoginForm } from "@/app/login/login-form";
import * as donorActions from "@/app/benfeitor/_actions/donor-actions";
import * as formActions from "@/app/form/_actions/form-actions";
import * as authActions from "@/app/login/_actions/auth-actions";
import { withServerActions } from "./helpers/server-actions";

const { loginAction } = vi.hoisted(() => ({ loginAction: vi.fn() }));

vi.mock("@/app/benfeitor/_actions/donor-actions", () => ({ registerDonorPledge: vi.fn() }));
vi.mock("@/app/form/_actions/form-actions", () => ({ createUploadUrl: vi.fn(), submitApplication: vi.fn() }));
vi.mock("@/app/login/_actions/auth-actions", () => ({ loginAction }));

const render = withServerActions(donorActions, formActions, authActions);

afterEach(() => cleanup());

describe("ScholarshipForm initial props", () => {
  it("opens on the requested step with the given data", () => {
    render(
      <ScholarshipForm
        initialStep={6}
        initialData={{ ...INITIAL_FORM_DATA, pai_nome: "José Carlos de Almeida" }}
      />
    );
    expect(screen.getByTestId("step-6")).toBeInTheDocument();
    expect(screen.getByText("Etapa 6 de 6")).toBeInTheDocument();
    expect(screen.getByTestId("review-summary")).toHaveTextContent("José Carlos de Almeida");
    expect(screen.getByTestId("btn-submit")).toBeInTheDocument();
  });

  it("clamps an out-of-range step and shows initial validation errors", () => {
    render(<ScholarshipForm initialStep={9} />);
    expect(screen.getByTestId("step-6")).toBeInTheDocument();
    cleanup();

    render(<ScholarshipForm initialErrors={{ pai_nome: MSG_OBRIGATORIO }} />);
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getByText(MSG_OBRIGATORIO)).toBeInTheDocument();
  });

  it("keeps the empty first step by default", () => {
    render(<ScholarshipForm />);
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.queryByText(MSG_OBRIGATORIO)).not.toBeInTheDocument();
  });
});

describe("DonorForm initial props", () => {
  it("defaults to the monthly pledge", () => {
    render(<DonorForm />);
    expect(screen.getByRole("button", { name: "Mensal" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "R$ 80" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens on a one-time pledge with its first preset", () => {
    render(<DonorForm initialFrequencia="unica" />);
    expect(screen.getByRole("button", { name: "Uma vez" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "R$ 500" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Faça sua contribuição por Pix")).toBeInTheDocument();
  });

  it("shows initial errors and the confirmation for each frequency", () => {
    render(<DonorForm initialErrors={{ nome: "Informe seu nome." }} />);
    expect(screen.getByText("Informe seu nome.")).toBeInTheDocument();
    cleanup();

    render(<DonorForm initialDone />);
    expect(screen.getByTestId("donor-success")).toHaveTextContent(/instruções de pagamento por Pix/);
    cleanup();

    render(<DonorForm initialDone initialFrequencia="unica" />);
    expect(screen.getByTestId("donor-success")).toHaveTextContent(/combinar os detalhes da sua doação/);
  });
});

describe("LoginForm initialError", () => {
  it("shows the initial error and replaces it with the action result", async () => {
    loginAction.mockResolvedValue({ error: null });
    render(<LoginForm initialError="Credenciais inválidas. Verifique seu email e senha." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Credenciais inválidas");

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("public page layouts", () => {
  it("renders the benefactor header around its children", () => {
    render(<DonorPageLayout><p>conteúdo</p></DonorPageLayout>);
    expect(screen.getByRole("heading", { level: 1, name: "Seja um benfeitor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voltar à página principal/ })).toHaveAttribute("href", "/");
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("renders the scholarship header around its children", () => {
    render(<ScholarshipPageLayout><p>conteúdo</p></ScholarshipPageLayout>);
    expect(screen.getByRole("heading", { level: 1, name: "Solicitação de Bolsa" })).toBeInTheDocument();
    expect(screen.getByTestId("form-back-home")).toHaveAttribute("href", "/");
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});

describe("DonorReceiptPageView", () => {
  it("renders each link state without the server", () => {
    render(
      <DonorReceiptPageView
        view={{ state: "valid", ticket: "t", firstName: "Maria", competencia: "2026-11", expectedValue: "200.00", hasReceipt: true }}
      />
    );
    expect(screen.getByText("Olá, Maria.")).toBeInTheDocument();
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante enviado – aguardando conferência");
    cleanup();

    render(<DonorReceiptPageView view={{ state: "rate_limited" }} />);
    expect(screen.getByText(/Muitas tentativas de acesso/)).toBeInTheDocument();
    cleanup();

    render(<DonorReceiptPageView view={{ state: "invalid" }} />);
    expect(screen.getByText(/Este link não está disponível/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Comprovante Pix")).not.toBeInTheDocument();
  });
});
