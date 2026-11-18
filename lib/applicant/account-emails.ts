import { applicantLinkOrigin, sendApplicantEmail } from "@/lib/email/send-applicant-email";

const SIGNATURE = "Arca Nossa Senhora da Providência";

export function sendVerificationEmail(to: string, token: string) {
  return sendApplicantEmail({
    to,
    subject: "Confirme seu e-mail — Solicitação de Bolsa",
    body: `Prezado(a) responsável,

Recebemos o pedido de criação da sua conta para a Solicitação de Bolsa da ${SIGNATURE}.

Para confirmar seu e-mail e começar a preencher a solicitação, use o botão abaixo. O link vale por 48 horas.

Se você não fez este pedido, pode ignorar esta mensagem.`,
    action: {
      label: "Confirmar e-mail",
      url: `${applicantLinkOrigin()}/solicitar-bolsa/confirmar?token=${encodeURIComponent(token)}`,
    },
  });
}

export function sendPasswordResetEmail(to: string, token: string) {
  return sendApplicantEmail({
    to,
    subject: "Redefinição de senha — Solicitação de Bolsa",
    body: `Prezado(a) responsável,

Recebemos um pedido para redefinir a senha da sua conta na Solicitação de Bolsa da ${SIGNATURE}.

Para escolher uma nova senha, use o botão abaixo. O link vale por 1 hora.

Se você não fez este pedido, pode ignorar esta mensagem; sua senha continua a mesma.`,
    action: {
      label: "Escolher nova senha",
      url: `${applicantLinkOrigin()}/solicitar-bolsa/nova-senha?token=${encodeURIComponent(token)}`,
    },
  });
}

export function sendAccountExistsEmail(to: string) {
  return sendApplicantEmail({
    to,
    subject: "Você já tem uma conta — Solicitação de Bolsa",
    body: `Prezado(a) responsável,

Alguém tentou criar uma conta na Solicitação de Bolsa da ${SIGNATURE} com este e-mail, mas ele já está cadastrado.

Para continuar, entre com seu e-mail e senha. Se não se lembra da senha, use a opção "Esqueci minha senha" na página de entrada.

Se não foi você, pode ignorar esta mensagem.`,
    action: { label: "Entrar", url: `${applicantLinkOrigin()}/solicitar-bolsa/entrar` },
  });
}
