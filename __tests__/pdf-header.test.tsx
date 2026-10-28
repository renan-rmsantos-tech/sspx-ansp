import { isValidElement, type ReactNode, type ReactElement } from "react";
import { expect, it, vi } from "vitest";

const capture = vi.hoisted(() => ({ tree: null as unknown }));
vi.mock("@react-pdf/renderer", () => ({
  Document: "Document", Page: "Page", Text: "Text", View: "View", Image: "Image",
  StyleSheet: { create: (styles: unknown) => styles },
  renderToBuffer: async (tree: unknown) => { capture.tree = tree; return Buffer.from("PDF"); },
}));
import { renderApplicationPdf } from "@/lib/pdf/application-pdf";
import { renderDonorPdf } from "@/lib/pdf/donor-pdf";
import { renderDecisionPdf } from "@/lib/pdf/decision-pdf";
import { renderContractPdf } from "@/lib/pdf/contract-pdf";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";

function flatten(node: ReactNode): Array<ReactElement<Record<string, unknown>> | string> {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (typeof node === "string") return [node];
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  if (typeof node.type === "function") return flatten((node.type as (props: unknown) => ReactNode)(node.props));
  return [node, ...flatten(node.props.children as ReactNode)];
}

const application = { escola: "Escola", status: "pendente", pai_nome: "Pai", mae_nome: "Mãe", endereco: "Rua", telefone: "", students: [], other_children: [], vehicles: [], benefactors: [] };
const donor = { nome: "Benfeitor", cpf: "", email: "", frequencia: "unica" as const, valor: 10, created_at: "2026-10-28" };

it.each([undefined, true, false])("renders the same default/custom header and seal in all four PDF families (%s)", async (seal) => {
  const header = seal === undefined ? undefined : { linha1: 'Fundação São Tomé & <Filhos>', linha2: 'Educação "Católica"', linha3: "Itatiba • São Paulo", mostrar_selo: seal };
  const expected = header ?? DEFAULT_DOCUMENT_HEADER;
  const renderers = [
    () => renderApplicationPdf({ ...application, header }),
    () => renderDonorPdf({ ...donor, header }),
    () => renderDecisionPdf({ titulo: "Decisão", cabecalho: "", corpo: "", rodape: "", header }),
    () => renderContractPdf({ titulo: "Contrato", cabecalho: "", clausulas: [], rodape: "", header }),
  ];
  for (const render of renderers) {
    await render();
    const tree = flatten(capture.tree as ReactNode);
    const text = tree.filter((node) => typeof node === "string");
    for (const line of [expected.linha1, expected.linha2, expected.linha3].filter(Boolean)) expect(text).toContain(line);
    expect(tree.some((node) => typeof node !== "string" && node.type === "Image")).toBe(expected.mostrar_selo);
  }
});

it("omits whitespace-only optional lines in the PDF header", async () => {
  await renderDecisionPdf({ titulo: "", cabecalho: "", corpo: "", rodape: "", header: { ...DEFAULT_DOCUMENT_HEADER, linha2: "   ", linha3: "", mostrar_selo: false } });
  expect(flatten(capture.tree as ReactNode)).not.toContain("   ");
});

it.each(["Rodapé & educação\nItatiba", ""])("renders/omits institutional footer independently of legal text in all four families (%s)", async (footer) => {
  const header = { ...DEFAULT_DOCUMENT_HEADER, rodape_institucional: footer };
  for (const render of [
    () => renderApplicationPdf({ ...application, header }),
    () => renderDonorPdf({ ...donor, header }),
    () => renderDecisionPdf({ titulo: "Decisão", cabecalho: "", corpo: "", rodape: "Assinatura legal", header }),
    () => renderContractPdf({ titulo: "Contrato", cabecalho: "", clausulas: [], rodape: "Assinatura legal", header }),
  ]) {
    await render();
    const tree = flatten(capture.tree as ReactNode);
    const fixed = tree.filter(node => typeof node !== "string" && node.props.fixed);
    expect(fixed).toHaveLength(footer ? 1 : 0);
    for (const line of footer.split("\n").filter(Boolean)) expect(tree).toContain(line);

  }
});

it("uses explicit communication fonts in all PDF families, including optional header lines and footers", async () => {
  const { COMMUNICATION_FONTS: fonts } = await import("@/lib/documents/communication-fonts");
  const header = { ...DEFAULT_DOCUMENT_HEADER, linha1: "Instituição", linha2: "Educação", linha3: "Itatiba", rodape_institucional: "Contato institucional" };
  for (const render of [
    () => renderApplicationPdf({ ...application, header }),
    () => renderDonorPdf({ ...donor, header }),
    () => renderDecisionPdf({ titulo: "Decisão", cabecalho: "Decisão", corpo: "Corpo legal", rodape: "", header }),
    () => renderContractPdf({ titulo: "Contrato", cabecalho: "Corpo legal", clausulas: [], rodape: "", header }),
  ]) {
    await render();
    const nodes = flatten(capture.tree as ReactNode).filter((node): node is ReactElement<Record<string, unknown>> => typeof node !== "string");
    const page = nodes.find(node => node.type === "Page")!;
    expect((page.props.style as Array<{ fontFamily?: string }>)[0].fontFamily).toBe(fonts.pdf.body);
    for (const line of [header.linha1, header.linha2, header.linha3, header.rodape_institucional]) {
      const text = nodes.find(node => node.type === "Text" && node.props.children === line)!;
      expect((text.props.style as { fontFamily: string }).fontFamily).toBe(line === header.rodape_institucional ? fonts.pdf.body : fonts.pdf.heading);
    }
  }
});
