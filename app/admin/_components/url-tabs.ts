"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Abas de página no estilo do protótipo (sublinhado), por cima do shadcn `Tabs` (variant="line"). */
export const PAGE_TABS_LIST_CLASS =
  "w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 group-data-horizontal/tabs:h-10";
export const PAGE_TABS_TRIGGER_CLASS =
  "h-10 flex-none rounded-none px-3 text-sm font-medium text-muted hover:text-fg data-active:text-accent after:bg-accent group-data-horizontal/tabs:after:bottom-[-1px]";

/**
 * Aba sincronizada com `?aba=`: lê com `useSearchParams`, troca na hora com
 * estado local e grava na URL com `router.replace` sem rolar a página.
 * Voltar/avançar no navegador segue a URL.
 */
export function useUrlTab<T extends string>(basePath: string, tabs: readonly T[], fallback: T) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = parseTab(searchParams?.get("aba"), tabs, fallback);
  const [value, setValue] = useState<T>(fromUrl);
  // Segue a URL (voltar/avançar) ajustando o estado durante a renderização,
  // sem efeito: só reage quando o valor lido da URL muda.
  const [seenFromUrl, setSeenFromUrl] = useState<T>(fromUrl);
  if (fromUrl !== seenFromUrl) {
    setSeenFromUrl(fromUrl);
    setValue(fromUrl);
  }

  function change(next: T) {
    setValue(next);
    router.replace(`${basePath}?aba=${next}`, { scroll: false });
  }

  return [value, change] as const;
}

function parseTab<T extends string>(raw: string | null | undefined, tabs: readonly T[], fallback: T): T {
  return tabs.find((tab) => tab === raw) ?? fallback;
}
