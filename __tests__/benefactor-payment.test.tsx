import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/app/benfeitor/_actions/donor-actions", () => ({ registerDonorPledge: vi.fn() }));
vi.mock("@/app/form/_components/file-upload", () => ({ FileUpload: () => <div /> }));

import SejaUmBenfeitorPage from "@/app/seja-um-benfeitor/page";

describe("SejaUmBenfeitorPage", () => {
  it("shows the current Pix payment details and QR code", () => {
    render(<SejaUmBenfeitorPage />);
    expect(screen.queryByRole("heading", { name: "Faça sua contribuição por Pix" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));
    expect(screen.getByText("02862d22-6b43-45f8-9b58-265f3deeb5dd")).toBeInTheDocument();
    expect(screen.getByText("0197 · 13.008.003-2")).toBeInTheDocument();
    expect(screen.getByText("42.736.079/0001-63")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR Code Pix para contribuição à ACIPEC" })).toHaveAttribute("src", "/pix-acipec.png");
    const form = screen.getByTestId("donor-form");
    expect(form).toContainElement(screen.getByRole("heading", { name: "Faça sua contribuição por Pix" }));
    expect(screen.getAllByText("02862d22-6b43-45f8-9b58-265f3deeb5dd")).toHaveLength(1);
  });
});
