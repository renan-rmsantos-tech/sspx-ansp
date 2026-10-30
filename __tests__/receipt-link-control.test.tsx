import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const issue = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/_actions/donor-receipt-actions", () => ({ issueDonorReceiptRecoveryLink: issue }));
import { ReceiptLinkControl } from "@/app/admin/_components/receipt-link-control";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("admin receipt link control", () => {
  it("generates, displays expiry, and copies the URL", async () => {
    issue.mockResolvedValue({ status: "issued", link: "https://example.test/benfeitor/comprovante?ticket=secret", expiresAt: "2026-11-12T12:00:00Z" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ReceiptLinkControl pledgeId="pledge" competencia="2026-10" />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar link de comprovante" }));
    await waitFor(() => expect(screen.getByLabelText("Link do comprovante")).toHaveValue("https://example.test/benfeitor/comprovante?ticket=secret"));
    expect(screen.getByText(/Válido até/)).toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText("Link do comprovante"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("ticket=secret")));
    expect(screen.getByRole("status")).toHaveTextContent("Link copiado.");
    expect(screen.queryByText(/email|e-mail/i)).not.toBeInTheDocument();
  });
  it("reports generation and clipboard failures", async () => {
    issue.mockResolvedValueOnce({ status: "unavailable" }).mockResolvedValueOnce({ status: "issued", link: "https://example.test", expiresAt: "2026-11-12T12:00:00Z" });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<ReceiptLinkControl pledgeId="pledge" competencia="2026-10" />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar link de comprovante" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("não aceita"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar link de comprovante" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copiar link" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Não foi possível copiar"));
  });
});
