import { describe, it, expect } from "vitest";
import {
  applicationSubmissionSchema,
  type ApplicationSubmission,
} from "@/lib/validations/application-schema";

function validApplication(): ApplicationSubmission {
  return {
    escola: "Colégio São José",
    pai: {
      nome: "João da Silva",
      rg: "12.345.678-9",
      cpf: "529.982.247-25",
      profissao: "Engenheiro",
      documentos: ["pending/uuid1/rg_pai/rg.pdf"],
    },
    mae: {
      nome: "Maria da Silva",
      cpf: "111.444.777-35",
      profissao: "Professora",
      documentos: ["pending/uuid1/rg_mae/rg.pdf"],
    },
    certidao_casamento: ["pending/uuid1/certidao/cert.pdf"],
    endereco: "Rua das Flores, 123",
    cep: "13250-000",
    telefone: "(11) 99999-9999",
    email: "joao@email.com",
    comprovante_endereco: ["pending/uuid1/comprovante/comp.pdf"],
    outros_filhos: [
      { nome: "Pedro Silva", nascimento: "2015-03-20" },
    ],
    alunos: [
      {
        nome: "Ana Silva",
        cpf: "529.982.247-25",
        serie: "5º ano",
        mensalidade: 1200,
        documentos: ["pending/uuid1/rg_aluno/rg.pdf"],
      },
    ],
    desconto_solicitado: 50,
    renda: { pai: 3000, mae: 2500, outros: 0, pessoas: 4 },
    extrato_ir: ["pending/uuid1/extrato_ir/ir.pdf"],
    despesas: {
      aluguel: 1200,
      servicos: 300,
      tv: 100,
      celular_plano: 80,
      celular_parcelas: 0,
      internet: 100,
    },
    extratos_bancarios: ["pending/uuid1/extrato_bancario/ext.pdf"],
    veiculos: [{ marca: "Fiat", modelo: "Uno", ano: "2015" }],
    colaboracao: {
      limpeza: { ativo: true, vezes_semana: 2 },
      mutirao: { ativo: false },
      arrecadacao: true,
      benfeitores: false,
    },
    indicacao_benfeitores: [
      { nome: "Carlos Souza", email: "carlos@email.com" },
    ],
  };
}

describe("applicationSubmissionSchema", () => {
  it("accepts valid complete application data", () => {
    const result = applicationSubmissionSchema.safeParse(validApplication());
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields (pai_nome, pai_cpf)", () => {
    const data = validApplication();
    data.pai.nome = "";
    data.pai.cpf = "";
    const result = applicationSubmissionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("pai.nome");
      expect(paths).toContain("pai.cpf");
    }
  });

  it("rejects invalid CPF (wrong check digits)", () => {
    const data = validApplication();
    data.pai.cpf = "529.982.247-26";
    const result = applicationSubmissionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const cpfIssue = result.error.issues.find(
        (i) => i.path.join(".") === "pai.cpf"
      );
      expect(cpfIssue).toBeDefined();
      expect(cpfIssue!.message).toBe("CPF inválido");
    }
  });

  it("rejects negative income values", () => {
    const data = validApplication();
    data.renda.pai = -500;
    const result = applicationSubmissionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects negative expense values", () => {
    const data = validApplication();
    data.despesas.aluguel = -100;
    const result = applicationSubmissionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty student array", () => {
    const data = validApplication();
    data.alunos = [];
    const result = applicationSubmissionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "alunos"
      );
      expect(issue).toBeDefined();
    }
  });

  it("rejects desconto_solicitado outside 0-100 range", () => {
    const over = validApplication();
    over.desconto_solicitado = 101;
    expect(applicationSubmissionSchema.safeParse(over).success).toBe(false);

    const under = validApplication();
    under.desconto_solicitado = -1;
    expect(applicationSubmissionSchema.safeParse(under).success).toBe(false);
  });

  it("accepts application with minimal optional data", () => {
    const data = validApplication();
    delete (data as Record<string, unknown>).certidao_casamento;
    data.pai.profissao = undefined;
    data.mae.profissao = undefined;
    data.cep = undefined;
    data.email = undefined;
    data.outros_filhos = [];
    data.veiculos = [];
    data.indicacao_benfeitores = [];
    data.despesas = {};
    data.renda = { pessoas: 2 };
    const result = applicationSubmissionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
