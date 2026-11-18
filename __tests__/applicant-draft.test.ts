import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { draftSnapshot, INITIAL_FORM_DATA, restoreDraft } from "@/app/form/_components/form-types";
import { referencedUploadDirs } from "@/lib/applicant/draft-cleanup";

const ACC = "11111111-1111-4111-8111-111111111111";
const UP1 = "22222222-2222-4222-8222-222222222222";
const UP2 = "33333333-3333-4333-8333-333333333333";

describe("restoreDraft", () => {
  it("starts from the empty form with the account e-mail when there is no draft", () => {
    expect(restoreDraft(undefined, "maria@example.com")).toEqual({ ...INITIAL_FORM_DATA, email: "maria@example.com" });
  });

  it("keeps known fields with the right type and drops unknown or mistyped ones", () => {
    const restored = restoreDraft({ pai_nome: "José", pessoas_domicilio: 4, desconhecido: "x", veiculos: "não é lista" }, "m@e.com");
    expect(restored.pai_nome).toBe("José");
    expect(restored.pessoas_domicilio).toBe("");
    expect(restored.veiculos).toEqual([]);
    expect("desconhecido" in restored).toBe(false);
  });

  it("drops uploads that had not finished and keeps completed ones, including per student", () => {
    const done = { id: "a", name: "rg.pdf", path: `drafts/${ACC}/${UP1}/rg_pai/rg.pdf` };
    const restored = restoreDraft({
      doc_pai: [done, { name: "x.pdf", path: "", uploading: true }, { name: "y.pdf", path: "p", error: "falhou" }],
      alunos: [{ nome: "Ana", docRg: [done], docCertidao: "inválido" }],
    });
    expect(restored.doc_pai).toEqual([done]);
    expect(restored.alunos[0]).toMatchObject({ nome: "Ana", docRg: [done], docCertidao: [], cpf: "" });
  });
});

describe("draftSnapshot", () => {
  it("removes in-progress and failed uploads before saving", () => {
    const snapshot = draftSnapshot({
      ...INITIAL_FORM_DATA,
      extrato_ir: [
        { id: "1", name: "ir.pdf", path: "drafts/a/b/extrato_ir/ir.pdf" },
        { id: "2", name: "x.pdf", path: "", uploading: true },
      ],
    });
    expect(snapshot.extrato_ir).toEqual([{ id: "1", name: "ir.pdf", path: "drafts/a/b/extrato_ir/ir.pdf" }]);
  });
});

describe("referencedUploadDirs", () => {
  it("lists the account/upload folders cited by the drafts", () => {
    const dirs = referencedUploadDirs([
      { data: { doc_pai: [{ path: `drafts/${ACC}/${UP1}/rg_pai/rg.pdf` }], alunos: [{ docRg: [{ path: `drafts/${ACC}/${UP2}/rg_aluno_0/a.pdf` }] }] } },
    ]);
    expect([...dirs].sort()).toEqual([`${ACC}/${UP1}`, `${ACC}/${UP2}`]);
  });
});

describe("documentLabel", () => {
  it("never throws on a missing category", async () => {
    const { documentLabel } = await import("@/lib/applicant/document-labels");
    expect(documentLabel(undefined)).toBe("Documento");
    expect(documentLabel("rg_aluno", "Ana")).toBe("RG do Aluno — Ana");
    expect(documentLabel("certidao_casamento")).toBe("Certidão de Casamento");
  });
});
