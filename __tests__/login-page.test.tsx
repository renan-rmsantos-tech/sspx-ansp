import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LoginForm } from "@/app/login/login-form";
import * as authActions from "@/app/login/_actions/auth-actions";
import { withServerActions } from "./helpers/server-actions";

const render = withServerActions(authActions);

const mockLoginAction = vi.fn();

vi.mock("@/app/login/_actions/auth-actions", () => ({
  loginAction: (...args: unknown[]) => mockLoginAction(...args),
}));

vi.mock("@/components/ui/seal-logo", () => ({
  SealLogo: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="seal-logo" data-size={size} className={className} />
  ),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockLoginAction.mockReset();
    mockLoginAction.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("renders the seal logo", () => {
    render(<LoginForm />);
    expect(screen.getByTestId("seal-logo")).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("displays error message when login action returns error", async () => {
    mockLoginAction.mockResolvedValue({
      error: "Credenciais inválidas. Verifique seu email e senha.",
    });

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Credenciais inválidas"
      );
    });
  });

  it("shows loading state during submission", async () => {
    let resolveLogin: (value: unknown) => void;
    mockLoginAction.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Entrando…" })
      ).toBeDisabled();
    });

    resolveLogin!({ error: null });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    });
  });

  it("shows demo credentials when hint is enabled", () => {
    render(
      <LoginForm
        showCredentialsHint
        hintEmail="admin@admin.com"
        hintPassword="admin123"
      />
    );
    expect(screen.getByText(/Para demonstração/)).toBeInTheDocument();
    expect(screen.getByText("admin@admin.com")).toBeInTheDocument();
    expect(screen.getByText("admin123")).toBeInTheDocument();
  });

  it("submits email and password via form action", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@ansp.org" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(mockLoginAction).toHaveBeenCalled();
      const formData = mockLoginAction.mock.calls[0][1] as FormData;
      expect(formData.get("email")).toBe("admin@ansp.org");
      expect(formData.get("password")).toBe("secret123");
    });
  });
});
