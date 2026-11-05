import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/modelos",
}));

import { CartazBenfeitores } from "@/app/_divulgacao/cartaz-benfeitores";
import { CartazFamilias } from "@/app/_divulgacao/cartaz-familias";
import { PostRedes } from "@/app/_divulgacao/post-redes";
import { ContractTemplateEditor } from "@/app/admin/_components/contract-template-editor";
import { TemplateEditor } from "@/app/admin/_components/template-editor";
import { DonorMonthlyInstructionsClient } from "@/app/admin/emails/_clients/monthly-instructions";
import { DonorReminderClient } from "@/app/admin/emails/_clients/reminders";
import { DonorEmailClient } from "@/app/admin/emails/_clients/welcome";
import { ModelosTabs } from "@/app/admin/modelos/modelos-tabs";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";

const error = { type: "error" as const, text: "Não foi possível salvar o modelo. Tente novamente." };
const template = { assunto: "Assunto", corpo: "Corpo" };
const preview = { assunto: "Assunto", bodyHtml: "<p>Corpo</p>" };

afterEach(cleanup);

describe("mensagem de salvamento inicial", () => {
  it("aparece ao abrir os editores de e-mail", () => {
    const { unmount } = render(
      <DonorEmailClient initialTemplate={template} initialPending={[]} header={DEFAULT_DOCUMENT_HEADER} resendConfigured initialMessage={error} />
    );
    expect(screen.getByText(error.text)).toBeInTheDocument();
    unmount();

    const second = render(
      <DonorMonthlyInstructionsClient initialTemplate={template} initialPreview={preview} header={DEFAULT_DOCUMENT_HEADER} resendConfigured initialMessage={error} />
    );
    expect(screen.getByText(error.text)).toBeInTheDocument();
    second.unmount();

    render(
      <DonorReminderClient initialTemplate={template} initialPreview={preview} initialSends={[]} header={DEFAULT_DOCUMENT_HEADER} resendConfigured initialMessage={error} />
    );
    expect(screen.getByText(error.text)).toBeInTheDocument();
  });

  it("aparece ao abrir os editores de modelos e chega pela aba em ModelosTabs", () => {
    const { unmount } = render(<TemplateEditor initialTemplates={[]} tipo="aprovacao" initialMessage={error} />);
    expect(screen.getByText(error.text)).toBeInTheDocument();
    unmount();

    const second = render(<ContractTemplateEditor initialTemplate={null} initialMessage={error} />);
    expect(screen.getByText(error.text)).toBeInTheDocument();
    second.unmount();

    render(<ModelosTabs templates={[]} contract={null} initialMessages={{ aprovacao: error }} />);
    expect(screen.getByText(error.text)).toBeInTheDocument();
  });

  it("não aparece sem a prop", () => {
    render(<TemplateEditor initialTemplates={[]} tipo="aprovacao" />);
    expect(screen.queryByText(error.text)).not.toBeInTheDocument();
  });
});

describe("materiais de divulgação", () => {
  it("o cartaz dos benfeitores tem o esquema, o convite e o QR Code do site", () => {
    render(<CartazBenfeitores />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Uma estrutura comum para dar estabilidade às bolsas");
    expect(screen.getByRole("region", { name: /Esquema/ })).toBeInTheDocument();
    expect(screen.getByText("Esta obra cresce quando todos a fazem conhecida")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR Code para www.arcaprovidencia.com.br" })).toHaveAttribute("src", "/divulgacao/qrcode-site.svg");
  });

  it("o cartaz das famílias lista os três passos da solicitação", () => {
    render(<CartazFamilias />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Peça sua bolsa de estudos");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "01Preencha os dados da família e dos alunos",
      "02Anexe a documentação solicitada",
      "03Aguarde a análise da comissão avaliadora",
    ]);
  });

  it("o post muda de texto pelo tema e mostra a frase só no story", () => {
    const { unmount } = render(<PostRedes tema="benfeitores" formato="quadrado" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sustente a formação católica de um aluno");
    expect(screen.queryByText(/Ajudar a formar as almas/)).not.toBeInTheDocument();
    unmount();

    render(<PostRedes tema="familias" formato="story" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Peça sua bolsa de estudos");
    expect(screen.getByText(/Ajudar a formar as almas/)).toBeInTheDocument();
  });
});
