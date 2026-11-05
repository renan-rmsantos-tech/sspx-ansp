import { defineProtoConfig } from "@compozy/proto/config";

/** Galeria de protótipos: `npm run proto dev` (veja docs/design/prototyping.md). */
export default defineProtoConfig({
  title: "ANSP",
  locale: "pt-BR",
  prototypes: ["app/**/*.proto.tsx", "components/**/*.proto.tsx", "drafts/**/*.proto.tsx"],
  drafts: "drafts",
  roles: { admin: "Administração", secretaria: "Secretaria" },
  guards: {
    // Protótipos e drafts renderizam views com fixtures: nunca alcançam banco,
    // sessão, armazenamento, envio de e-mail ou server actions. Os templates
    // de e-mail em lib/email são funções puras que as views usam na prévia;
    // o envio, os stores e os anexos (lidos do disco) ficam bloqueados.
    forbidRuntimeImports: [
      "lib/db",
      "lib/auth",
      "lib/storage",
      "lib/email/send-*.ts",
      "lib/email/*-store.ts",
      "lib/email/institutional-email-attachments.ts",
      "app/**/_actions/**",
      "proxy.ts",
      "next/headers",
      "next/server",
      "postgres",
      "drizzle-orm",
      "iron-session",
      "resend",
    ],
  },
});
