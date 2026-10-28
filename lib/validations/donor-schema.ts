import { z } from "zod";
import { isValidCPF } from "./cpf";
import { PRIORADO_CAPELA_VALUES } from "@/lib/data/priorados-capelas";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const BRAZILIAN_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export const PUBLIC_MONTHLY_DUE_DAYS = [1, 10, 15, 20, 30] as const;

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
    residence_city: z.string().trim().min(1, "Informe sua cidade."),
    residence_state: z.enum(BRAZILIAN_UFS, { message: "Selecione uma UF válida." }),
    residence_confirmed: z.boolean().refine((confirmed) => confirmed, {
      message: "Confirme sua cidade e UF.",
    }),
    priorado_capela: z.enum(PRIORADO_CAPELA_VALUES, {
      message: "Selecione o priorado ou capela",
    }),
    frequencia: z.enum(["unica", "mensal"]),
    duracao: z.enum(["um_ano", "indeterminado"]).optional(),
    dia_vencimento: z.number().int().refine(
      (day) => PUBLIC_MONTHLY_DUE_DAYS.some((choice) => choice === day),
      { message: "Selecione um dia de pagamento: 1, 10, 15, 20 ou 30." }
    ).optional(),
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
    (data) => data.frequencia !== "mensal" || data.dia_vencimento !== undefined,
    {
      message: "Selecione um dia de pagamento: 1, 10, 15, 20 ou 30.",
      path: ["dia_vencimento"],
    }
  )
  .refine(
    (data) => data.frequencia !== "unica" || z.iso.date().safeParse(data.data_pagamento).success,
    {
      message: "Informe uma data de pagamento válida",
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
