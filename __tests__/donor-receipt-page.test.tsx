import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import nextConfig from "@/next.config";

const { getContext, getHeaders } = vi.hoisted(() => ({ getContext: vi.fn(), getHeaders: vi.fn() }));
vi.mock("next/headers", () => ({ headers: getHeaders }));
vi.mock("@/lib/donor-receipts/service", () => ({ getPublicDonorReceiptContext: getContext }));

import ReceiptPage, { dynamic, metadata } from "@/app/benfeitor/comprovante/page";

beforeEach(() => {
  getHeaders.mockResolvedValue(new Headers());
  getContext.mockReset();
});
afterEach(() => cleanup());

async function renderPage(ticket: string | undefined = "opaque-ticket") {
  render(await ReceiptPage({ searchParams: Promise.resolve({ ticket }) }));
}

describe("public monthly receipt page", () => {
  it("projects only first name, competence, and expected amount for a valid link", async () => {
    getContext.mockResolvedValue({ state: "valid", firstName: "Ana", competencia: "2026-11", expectedValue: "80.00", hasReceipt: false });
    await renderPage();
    expect(getContext).toHaveBeenCalledWith("opaque-ticket", "unknown");
    expect(screen.getByText("Olá, Ana.")).toBeInTheDocument();
    expect(screen.getByText("novembro de 2026")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*80,00/)).toBeInTheDocument();
    expect(screen.getByLabelText("Comprovante Pix")).toHaveAttribute("type", "file");
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante pendente");
    expect(screen.getByText(/Cada pagamento mensal exige seu próprio comprovante/)).toBeInTheDocument();
    expect(screen.getByText(/substituirá o anterior/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/CPF|@example|Ana Sobrenome|donors\/|receipt_path/i);
    expect(document.querySelectorAll("a[href], img[src], script[src]")).toHaveLength(0);
  });

  it("gives the same no-detail state for invalid and expired links", async () => {
    for (const ticket of [undefined, "expired", "tampered"]) {
      getContext.mockResolvedValueOnce({ state: "invalid" });
      await renderPage(ticket);
      expect(screen.getByText(/Este link não está disponível/)).toBeInTheDocument();
      expect(screen.queryByLabelText("Comprovante Pix")).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/competência|valor previsto|Ana|CPF|e-mail/i);
      cleanup();
    }
  });

  it("keeps receipt replacement available without exposing bank review", async () => {
    getContext.mockResolvedValue({
      state: "valid", firstName: "Ana", competencia: "2026-11", expectedValue: "80.00",
      bankStatus: "confirmado", hasReceipt: false,
    });
    await renderPage();
    expect(screen.getByLabelText("Comprovante Pix")).toBeInTheDocument();
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante pendente");
    expect(document.body.textContent).not.toContain("confirmado");
  });

  it("shows an already uploaded receipt without exposing bank review or removing replacement", async () => {
    getContext.mockResolvedValue({
      state: "valid", firstName: "Ana", competencia: "2026-11", expectedValue: "80.00", hasReceipt: true,
    });
    await renderPage();
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante enviado – aguardando conferência");
    expect(screen.getByLabelText("Comprovante Pix")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/receipt_path|donors\//);
  });

  it("shows a no-detail throttle state and rejects ambiguous ticket parameters", async () => {
    getContext.mockResolvedValue({ state: "rate_limited", retryAfter: 30 });
    render(await ReceiptPage({ searchParams: Promise.resolve({ ticket: ["one", "two"] }) }));
    expect(getContext).toHaveBeenCalledWith(null, "unknown");
    expect(screen.getByText(/Muitas tentativas de acesso/)).toBeInTheDocument();
  });

  it("sets dynamic rendering and route-level privacy headers", async () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    const rules = await nextConfig.headers!();
    const receipt = rules.find((rule) => rule.source === "/benfeitor/comprovante");
    expect(receipt?.headers).toEqual(expect.arrayContaining([
      { key: "Cache-Control", value: "private, no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ]));
  });
});
