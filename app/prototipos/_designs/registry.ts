import type { ComponentType } from "react";
import AdminRedesign from "./admin-redesign";

/**
 * Registro dos protótipos servidos em /prototipos/{slug} (somente em
 * desenvolvimento). Cada protótipo vive em `./{slug}/index.tsx` e só pode
 * importar UI de `@/components/ui` e tokens de `app/globals.css`.
 */
export const PROTOTYPES: Record<string, { title: string; Component: ComponentType }> = {
  "admin-redesign": {
    title: "Painel administrativo — redesenho",
    Component: AdminRedesign,
  },
};
