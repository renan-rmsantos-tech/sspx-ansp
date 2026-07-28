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
        { name: "doc.pdf", path: "pending/uuid1/rg_pai/doc.pdf" },
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
        { name: "existing.pdf", path: "existing/path" },
        { name: "new.pdf", path: "pending/uuid1/rg_pai/new.pdf" },
      ]);
    });
  });
});
