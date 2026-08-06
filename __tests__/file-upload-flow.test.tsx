import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { FileUpload } from "@/app/form/_components/file-upload";

const mockCreateUploadUrl = vi.fn();

vi.mock("@/app/form/_actions/form-actions", () => ({
  createUploadUrl: (...args: unknown[]) => mockCreateUploadUrl(...args),
}));

describe("FileUpload upload flow", () => {
  beforeEach(() => {
    mockCreateUploadUrl.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uploads a file via an upload ticket on file input change", async () => {
    mockCreateUploadUrl.mockResolvedValue({
      url: "https://storage.example.com/upload",
      path: "pending/uuid1/rg_pai/doc.pdf",
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const onChange = vi.fn();
    render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[]}
        onChange={onChange}
      />
    );

    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("upload-input");

    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(mockCreateUploadUrl).toHaveBeenCalledWith("doc.pdf", "rg_pai");
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({
          name: "doc.pdf",
          path: "pending/uuid1/rg_pai/doc.pdf",
          uploading: false,
        }),
      ]);
    });
  });

  it("handles an upload ticket error", async () => {
    mockCreateUploadUrl.mockResolvedValue({
      error: "Erro ao gerar URL",
    });

    const onChange = vi.fn();
    render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[]}
        onChange={onChange}
      />
    );

    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("upload-input");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ name: "doc.pdf", error: "Erro ao gerar URL" }),
      ]);
    });
  });

  it("handles fetch failure during upload", async () => {
    mockCreateUploadUrl.mockResolvedValue({
      url: "https://storage.example.com/upload",
      path: "pending/uuid1/rg_pai/doc.pdf",
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const onChange = vi.fn();
    render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[]}
        onChange={onChange}
      />
    );

    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("upload-input");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({
          name: "doc.pdf",
          error: "Erro ao enviar arquivo",
        }),
      ]);
    });
  });

  it("handles drop event and uploads files", async () => {
    mockCreateUploadUrl.mockResolvedValue({
      url: "https://storage.example.com/upload",
      path: "pending/uuid1/rg_pai/doc.pdf",
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const onChange = vi.fn();
    render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[]}
        onChange={onChange}
      />
    );

    const file = new File(["content"], "dropped.pdf", {
      type: "application/pdf",
    });
    const area = screen.getByTestId("upload-area");

    fireEvent.drop(area, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(mockCreateUploadUrl).toHaveBeenCalledWith(
        "dropped.pdf",
        "rg_pai"
      );
    });
  });

  it("appends files in multiple mode", async () => {
    mockCreateUploadUrl.mockResolvedValue({
      url: "https://storage.example.com/upload",
      path: "pending/uuid1/rg_pai/new.pdf",
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const onChange = vi.fn();
    render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[{ name: "existing.pdf", path: "existing/path" }]}
        onChange={onChange}
        multiple
      />
    );

    const file = new File(["content"], "new.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("upload-input");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ name: "existing.pdf", path: "existing/path" }),
        expect.objectContaining({
          name: "new.pdf",
          path: "pending/uuid1/rg_pai/new.pdf",
        }),
      ]);
    });
  });

  it("rejects files over the 10 MB limit without calling the server", async () => {
    const onChange = vi.fn();
    render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[]}
        onChange={onChange}
      />
    );

    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });

    const input = screen.getByTestId("upload-input");
    Object.defineProperty(input, "files", { value: [big] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({
          name: "big.pdf",
          error: "Arquivo excede o limite de 10 MB.",
        }),
      ]);
    });
    expect(mockCreateUploadUrl).not.toHaveBeenCalled();
  });

  it("keeps a file removed during another upload out of the final list", async () => {
    let resolveTicket: (v: unknown) => void = () => {};
    mockCreateUploadUrl.mockReturnValue(
      new Promise((resolve) => {
        resolveTicket = resolve;
      })
    );
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    // Simula o pai controlado: onChange realimenta a prop `files`.
    const calls: unknown[][] = [];
    const onChange = vi.fn((next) => calls.push(next));

    const { rerender } = render(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={[{ id: "keep", name: "existing.pdf", path: "existing/path" }]}
        onChange={onChange}
        multiple
      />
    );

    const file = new File(["content"], "new.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("upload-input");
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    // Enquanto o upload está pendente, o usuário remove o arquivo existente.
    const latest = calls[calls.length - 1] as never[];
    rerender(
      <FileUpload
        label="enviar doc"
        category="rg_pai"
        files={latest.filter(
          (f: { name: string }) => f.name !== "existing.pdf"
        )}
        onChange={onChange}
        multiple
      />
    );

    resolveTicket({
      url: "https://storage.example.com/upload",
      path: "pending/uuid1/rg_pai/new.pdf",
    });

    await waitFor(() => {
      const final = calls[calls.length - 1] as Array<{ name: string }>;
      expect(final.map((f) => f.name)).toEqual(["new.pdf"]);
    });
  });
});
