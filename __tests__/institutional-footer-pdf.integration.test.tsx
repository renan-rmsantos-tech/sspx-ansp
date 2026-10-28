// @vitest-environment node
import { it, expect } from "vitest";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderDecisionPdf } from "@/lib/pdf/decision-pdf";
import { renderContractPdf } from "@/lib/pdf/contract-pdf";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";

it("renders a maximum-width footer on every page without overlapping long legal body content", async () => {
  const header = { ...DEFAULT_DOCUMENT_HEADER, mostrar_selo: false, rodape_institucional: Array(4).fill("W".repeat(80)).join("\n") };
  const body = Array.from({ length: 100 }, (_, i) => `Parágrafo ${i}: Educação católica e apoio às famílias. `).join("\n");
  const output = join(tmpdir(), "ansp-footer-worker-artifacts");
  mkdirSync(output, { recursive: true });
  const documents = [
    ["decision", await renderDecisionPdf({ titulo: "Decisão", cabecalho: "", corpo: body, rodape: "Assinatura legal preservada", header })],
    ["contract", await renderContractPdf({ titulo: "Contrato", cabecalho: "", clausulas: [{ titulo: "Cláusula", corpo: body }], rodape: "Assinatura legal preservada", header })],
  ] as const;
  for (const [name, pdf] of documents) {
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const path = join(output, `${name}-multipage.pdf`);
    writeFileSync(path, pdf);
    // Optional external geometry audit; the real renderer assertion above runs on every host.
    if (spawnSync("pdftotext", ["-v"]).status !== 0) continue;
    execFileSync("pdftotext", ["-bbox", path, `${path}.html`]);
    const pages = readFileSync(`${path}.html`, "utf8").split("<page ").slice(1);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      const words = [...page.matchAll(/<word xMin="[^"]+" yMin="([^"]+)" xMax="[^"]+" yMax="([^"]+)">([^<]*)<\/word>/g)];
      const footer = words.filter(word => /^W+-?$/.test(word[3]));
      const bodyWords = words.filter(word => !/^W+-?$/.test(word[3]));
      expect(footer.length).toBeGreaterThan(0);
      expect(Math.max(...bodyWords.map(word => Number(word[2])))).toBeLessThan(Math.min(...footer.map(word => Number(word[1]))));
      expect(Math.max(...footer.map(word => Number(word[2])))).toBeLessThan(818);
    }
    expect(pages.join("")).toContain("preservada");
  }
}, 20000);
