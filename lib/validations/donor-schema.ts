import { z } from "zod";
import { isValidCPF } from "./cpf";
import { PRIORADO_CAPELA_VALUES } from "@/lib/data/priorados-capelas";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const donorPledgeSchema = z
  .object({
    nome: z.string().min(1, "Nome é obrigatório"),
    cpf: z
      .string()
      .min(1, "CPF é obrigatório")
      .refine((v) => isValidCPF(v), { message: "CPF inválido" }),
    email: z
      .string()
      .min(1, "E-mail é obrigatório")
      .refine((v) => EMAIL_RE.test(v), { message: "E-mail inválido" }),
    telefone: z.string().min(1, "Telefone é obrigatório"),
    endereco: z.string().min(1, "Endereço é obrigatório"),
    cep: z.string().min(1, "CEP é obrigatório"),
    priorado_capela: z.enum(PRIORADO_CAPELA_VALUES, {
      message: "Selecione o priorado ou capela",
    }),
    frequencia: z.enum(["unica", "mensal"]),
    duracao: z.enum(["um_ano", "indeterminado"]).optional(),
    valor: z.number().positive("Informe um valor maior que zero"),
    data_pagamento: z.string().optional(),
    lembrete_canal: z.enum(["email"]).optional().nullable(),
    recibo_path: z.string().optional(),
    recibo_nome: z.string().optional(),
    observacoes: z.string().optional(),
  })
  .refine(
    (data) => data.frequencia !== "mensal" || Boolean(data.duracao),
    {
      message: "Selecione a duração da doação mensal",
      path: ["duracao"],
    }
  )
  .refine(
    (data) => data.frequencia !== "unica" || Boolean(data.data_pagamento?.trim()),
    {
      message: "Informe a data do pagamento",
      path: ["data_pagamento"],
    }
  )
  .refine(
    (data) =>
      data.frequencia !== "unica" ||
      (Boolean(data.recibo_path?.trim()) && Boolean(data.recibo_nome?.trim())),
    {
      message: "Envie o recibo de pagamento",
      path: ["recibo_path"],
    }
  );

export type DonorPledge = z.infer<typeof donorPledgeSchema>;
