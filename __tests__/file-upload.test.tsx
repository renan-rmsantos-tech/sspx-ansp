import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FileUpload } from "@/app/form/_components/file-upload";

vi.mock("@/app/form/_actions/form-actions", () => ({
  createUploadUrl: vi.fn().mockResolvedValue({
    url: "https://example.com/upload",
    path: "pending/abc/rg_pai/file.pdf",
  }),
}));

describe("FileUpload", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders upload area with label", () => {
    render(
      <FileUpload
        label="para enviar documento"
        category="rg_pai"
        files={[]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/para enviar documento/)).toBeInTheDocument();
    expect(screen.getByTestId("upload-area")).toBeInTheDocument();
  });

  it("handles drag-and-drop by toggling dragover style", () => {
    render(
      <FileUpload
        label="para enviar documento"
        category="rg_pai"
        files={[]}
        onChange={() => {}}
      />
    );
    const area = screen.getByTestId("upload-area");
    fireEvent.dragEnter(area, { preventDefault: () => {} });
    fireEvent.dragOver(area, { preventDefault: () => {} });
    fireEvent.dragLeave(area, { preventDefault: () => {} });
  });

  it("displays filename preview for uploaded files", () => {
    render(
      <FileUpload
        label="para enviar documento"
        category="rg_pai"
        files={[{ name: "meu-doc.pdf", path: "pending/abc/rg_pai/meu-doc.pdf" }]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("meu-doc.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("upload-preview")).toBeInTheDocument();
  });

  it("supports removing uploaded files", () => {
    const onChange = vi.fn();
    render(
      <FileUpload
        label="para enviar documento"
        category="rg_pai"
        files={[
          { name: "doc1.pdf", path: "path1" },
          { name: "doc2.pdf", path: "path2" },
        ]}
        onChange={onChange}
      />
    );
    const removeButtons = screen.getAllByTestId("remove-file");
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([{ name: "doc2.pdf", path: "path2" }]);
  });

  it("shows error state when error prop provided", () => {
    render(
      <FileUpload
        label="para enviar documento"
        category="rg_pai"
        files={[]}
        onChange={() => {}}
        error="Envie o documento"
      />
    );
    expect(screen.getByText("Envie o documento")).toBeInTheDocument();
  });

  it("shows uploading state for files being uploaded", () => {
    render(
      <FileUpload
        label="para enviar documento"
        category="rg_pai"
        files={[{ name: "doc.pdf", path: "", uploading: true }]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Enviando...")).toBeInTheDocument();
  });
});
