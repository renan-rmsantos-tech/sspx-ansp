import {
  BYPASS_EMAIL,
  BYPASS_PASSWORD,
  isAuthBypass,
} from "@/lib/auth/bypass";
import { ServerActionsProvider } from "@/components/server-actions";
import { loginAction } from "./_actions/auth-actions";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const showCredentialsHint = isAuthBypass();

  return (
    <ServerActionsProvider actions={{ loginAction }}>
      <LoginForm
        showCredentialsHint={showCredentialsHint}
        hintEmail={BYPASS_EMAIL}
        hintPassword={BYPASS_PASSWORD}
      />
    </ServerActionsProvider>
  );
}
