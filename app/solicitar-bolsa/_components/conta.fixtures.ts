import type { AccountFormState } from "../_actions/applicant-actions";
import type { MyApplicationData } from "./my-application";

export const applicantEmail = "maria.almeida@example.com";

export const unverifiedLoginState: AccountFormState = {
  error: "Confirme seu e-mail antes de entrar. Procure a mensagem que enviamos, inclusive na caixa de spam.",
  unverifiedEmail: applicantEmail,
};

export const invalidLoginState: AccountFormState = { error: "E-mail ou senha incorretos." };

export const signUpErrorsState: AccountFormState = {
  error: null,
  fieldErrors: {
    email: "E-mail inválido.",
    password: "A senha precisa ter pelo menos 8 caracteres.",
  },
};

export const sentState: AccountFormState = { error: null, sentTo: applicantEmail };

export const invalidLinkState: AccountFormState = {
  error:
    "Este link é inválido, já foi usado ou expirou. Entre com seu e-mail e senha para receber um novo link de confirmação.",
};

export const submittedApplication: MyApplicationData = {
  status: "pendente",
  data_envio: "2026-11-17T14:20:00.000Z",
  ano_letivo: "2027",
  alunos: [
    { nome: "Ana Clara de Almeida", serie: "5º Ano" },
    { nome: "Pedro de Almeida", serie: "2º Ano" },
  ],
};
