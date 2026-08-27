import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";

vi.mock("@/app/benfeitor/_actions/donor-actions", () => ({
  registerDonorPledge: vi.fn(),
}));

vi.mock("@/app/form/_components/file-upload", () => ({
  FileUpload: () => <div data-testid="file-upload" />,
}));

describe("DonorForm", () => {
  afterEach(cleanup);

  it("shows the correct donation presets for each payment frequency", () => {
    render(<DonorForm />);

    expect(screen.getByRole("button", { name: "R$ 80" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 100" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 200" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));

    expect(screen.getByRole("button", { name: "R$ 300" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 500" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 800" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "R$ 80" })).not.toBeInTheDocument();
  });
});
