import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReceiptUpload } from "@/app/benfeitor/comprovante/receipt-upload";

class FakeRequest {
  static current: FakeRequest;
  upload: { onprogress?: (event: ProgressEvent) => void } = {};
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  method = "";
  url = "";
  body: FormData | null = null;
  constructor() { FakeRequest.current = this; }
  open(method: string, url: string) { this.method = method; this.url = url; }
  send(body: FormData) { this.body = body; }
  abort() { /* component cleanup */ }
  complete(status: number) { this.status = status; this.onload?.(); }
}

beforeEach(() => { FakeRequest.current = undefined as unknown as FakeRequest; vi.stubGlobal("XMLHttpRequest", FakeRequest); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const pdf = () => new File(["%PDF-1.7\nproof\n%%EOF"], "proof.pdf", { type: "application/pdf" });

function select(file: File) {
  fireEvent.change(screen.getByLabelText("Comprovante Pix"), { target: { files: [file] } });
}
function submit() { fireEvent.click(screen.getByRole("button", { name: "Enviar comprovante" })); }

describe("monthly receipt upload", () => {
  it("offers one keyboard-accessible file input and explains required upload and replacement", () => {
    render(<ReceiptUpload ticket="opaque" />);
    const input = screen.getByLabelText("Comprovante Pix");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif,application/pdf");
    expect(input).toHaveAttribute("aria-describedby", "receipt-help receipt-feedback");
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante pendente");
    expect(screen.getByText(/comprovante obrigatório deste pagamento/)).toBeInTheDocument();
    expect(screen.getByText(/Se enviar outro comprovante.*substituirá o anterior/)).toBeInTheDocument();
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("button", { name: "Enviar comprovante" })).toHaveClass("w-full");
  });

  it("announces missing, empty, unsupported, and oversized file errors before a request", () => {
    render(<ReceiptUpload ticket="opaque" />);
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha uma imagem ou PDF");
    select(new File([], "empty.pdf", { type: "application/pdf" }));
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("válido");
    select(new File(["text"], "text.txt", { type: "text/plain" }));
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("válido");
    const large = pdf();
    Object.defineProperty(large, "size", { value: 10 * 1024 * 1024 + 1 });
    select(large);
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("10 MB");
    expect(FakeRequest.current).toBeUndefined();
  });

  it("posts the bearer in the request body, reports progress, confirms pending bank review, and allows replacement", () => {
    render(<ReceiptUpload ticket="opaque" />);
    select(pdf());
    submit();
    const first = FakeRequest.current;
    expect(first.method).toBe("POST");
    expect(first.url).toBe("/api/donor-receipts");
    expect(first.body?.get("ticket")).toBe("opaque");
    expect(first.body?.get("file")).toBeInstanceOf(File);
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    act(() => first.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent));
    expect(screen.getByText("Enviando comprovante: 50%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progresso do envio" })).toHaveAttribute("value", "50");
    act(() => first.complete(200));
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante enviado – aguardando conferência");
    expect(screen.getByRole("status")).toHaveTextContent("Comprovante recebido");
    expect(screen.getByRole("status")).toHaveTextContent("conferência bancária");
    select(pdf());
    submit();
    expect(FakeRequest.current).not.toBe(first);
    expect(FakeRequest.current.body?.get("ticket")).toBe("opaque");
  });

  it("starts in sent state and keeps replacement available", () => {
    render(<ReceiptUpload ticket="opaque" hasReceipt />);
    expect(screen.getByTestId("receipt-state")).toHaveTextContent("Comprovante enviado – aguardando conferência");
    expect(screen.getByRole("button", { name: "Enviar comprovante" })).toBeEnabled();
  });

  it("announces server validation, expired-link, and network errors", () => {
    render(<ReceiptUpload ticket="opaque" />);
    select(pdf());
    submit();
    act(() => FakeRequest.current.complete(400));
    expect(screen.getByRole("alert")).toHaveTextContent("imagem ou PDF válido");
    submit();
    act(() => FakeRequest.current.complete(413));
    expect(screen.getByRole("alert")).toHaveTextContent("10 MB");
    submit();
    act(() => FakeRequest.current.complete(403));
    expect(screen.getByRole("alert")).toHaveTextContent("link não está mais disponível");
    submit();
    act(() => FakeRequest.current.onerror?.());
    expect(screen.getByRole("alert")).toHaveTextContent("Tente novamente");
  });
});
