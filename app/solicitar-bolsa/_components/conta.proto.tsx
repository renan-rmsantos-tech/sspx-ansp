import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ScholarshipPageLayout } from "@/app/form/_components/scholarship-page-layout";
import { ApplicantPageLayout } from "./applicant-page-layout";
import {
  ApplicantBar,
  ApplicantLoginForm,
  ApplicantSignUpForm,
  ConfirmEmailForm,
  ForgotPasswordForm,
  ResetPasswordForm,
} from "./account-forms";
import { MyApplication } from "./my-application";
import {
  applicantEmail,
  invalidLinkState,
  invalidLoginState,
  sentState,
  signUpErrorsState,
  submittedApplication,
  unverifiedLoginState,
} from "./conta.fixtures";

export const meta = definePrototype({
  title: "Conta do solicitante de bolsa",
  spec: "publico",
  route: "/solicitar-bolsa/entrar",
  standalone: true,
  states: [
    { id: "entrar", label: "Entrar" },
    { id: "entrar-erro", label: "Entrar: e-mail ou senha incorretos" },
    { id: "entrar-nao-confirmado", label: "Entrar: e-mail ainda não confirmado" },
    { id: "cadastro", label: "Criar conta" },
    { id: "cadastro-erros", label: "Criar conta: erros de validação" },
    { id: "cadastro-enviado", label: "Criar conta: link de confirmação enviado" },
    { id: "confirmar", label: "Confirmar e-mail" },
    { id: "confirmar-invalido", label: "Confirmar e-mail: link inválido" },
    { id: "esqueci-senha", label: "Esqueci minha senha" },
    { id: "esqueci-senha-enviado", label: "Esqueci minha senha: link enviado" },
    { id: "nova-senha", label: "Escolher nova senha" },
    { id: "minha-solicitacao", label: "Minha solicitação: em análise" },
    { id: "minha-solicitacao-aprovada", label: "Minha solicitação: aprovada" },
    { id: "minha-solicitacao-vazia", label: "Minha solicitação: nenhuma enviada" },
  ],
});

function Screen({ state }: { state: string }) {
  switch (state) {
    case "entrar-erro":
      return <ApplicantLoginForm initialState={invalidLoginState} />;
    case "entrar-nao-confirmado":
      return <ApplicantLoginForm initialState={unverifiedLoginState} />;
    case "cadastro":
      return <ApplicantSignUpForm />;
    case "cadastro-erros":
      return <ApplicantSignUpForm initialState={signUpErrorsState} />;
    case "cadastro-enviado":
      return <ApplicantSignUpForm initialState={sentState} />;
    case "confirmar":
      return <ConfirmEmailForm token="token-de-exemplo" />;
    case "confirmar-invalido":
      return <ConfirmEmailForm token="token-de-exemplo" initialState={invalidLinkState} />;
    case "esqueci-senha":
      return <ForgotPasswordForm />;
    case "esqueci-senha-enviado":
      return <ForgotPasswordForm initialState={sentState} />;
    case "nova-senha":
      return <ResetPasswordForm token="token-de-exemplo" />;
    case "minha-solicitacao":
      return (
        <>
          <ApplicantBar email={applicantEmail} />
          <MyApplication application={submittedApplication} />
        </>
      );
    case "minha-solicitacao-aprovada":
      return (
        <>
          <ApplicantBar email={applicantEmail} />
          <MyApplication application={{ ...submittedApplication, status: "aprovada" }} />
        </>
      );
    case "minha-solicitacao-vazia":
      return (
        <>
          <ApplicantBar email={applicantEmail} />
          <MyApplication application={null} />
        </>
      );
    default:
      return <ApplicantLoginForm />;
  }
}

const PRESENTATION_STATES = new Set(["entrar", "entrar-erro", "entrar-nao-confirmado", "cadastro", "cadastro-erros", "cadastro-enviado"]);

export default function Prototype({ state }: PrototypeProps) {
  const Layout = PRESENTATION_STATES.has(state) ? ScholarshipPageLayout : ApplicantPageLayout;
  return (
    <Layout>
      <Screen key={state} state={state} />
    </Layout>
  );
}
