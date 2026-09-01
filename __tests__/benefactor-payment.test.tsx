import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/benfeitor/_components/donor-form", () => ({ DonorForm: () => <div data-testid="donor-form" /> }));

import SejaUmBenfeitorPage from "@/app/seja-um-benfeitor/page";

describe("SejaUmBenfeitorPage", () => {
  it("shows the current Pix payment details and QR code", () => {
    render(<SejaUmBenfeitorPage />);
    expect(screen.getByText("02862d22-6b43-45f8-9b58-265f3deeb5dd")).toBeInTheDocument();
    expect(screen.getByText("0197 · 13.008.003-2")).toBeInTheDocument();
    expect(screen.getByText("62.611.908/0001-99")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR Code Pix para contribuição à ACIPEC" })).toHaveAttribute("src", "/pix-acipec.png");
  });
});
