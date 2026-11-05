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
    // sessão, armazenamento, e-mail ou server actions.
    forbidRuntimeImports: [
      "lib/db",
      "lib/auth",
      "lib/storage",
      "lib/email",
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
