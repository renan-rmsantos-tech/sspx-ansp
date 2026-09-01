"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@/lib/auth/authorization";

const NAV_SECTIONS = [
  {
    title: "Dados",
    items: [
      {
        label: "Solicitações",
        href: "/admin/solicitacoes",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      {
        label: "Benfeitores",
        href: "/admin/benfeitores",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ),
      },
      {
        label: "Usuários",
        href: "/admin/usuarios",
        adminOnly: true,
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[18px] shrink-0"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>,
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      {
        label: "Ano Letivo",
        href: "/admin/ano-letivo",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        label: "Cabeçalho",
        href: "/admin/cabecalho",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <circle cx="8" cy="6.5" r="0.6" fill="currentColor" />
          </svg>
        ),
      },
      {
        label: "Textos de Decisão",
        href: "/admin/textos",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ),
      },
      {
        label: "Modelo de Contrato",
        href: "/admin/contrato",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        ),
      },
    ],
  },
] as const;

export function Sidebar({ role = "admin" }: { role?: StaffRole }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Menu mobile aberto se comporta como diálogo: foco entra no menu, Tab
  // circula dentro dele, Escape fecha e devolve o foco ao botão.
  useEffect(() => {
    if (!mobileOpen) return;

    const aside = asideRef.current;
    if (!aside) return;

    const focusables = () =>
      Array.from(
        aside.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      );

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !aside.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !aside.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        ref={toggleRef}
        type="button"
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-4 right-4 z-[var(--z-fab)] flex size-12 items-center justify-center rounded-full border border-border bg-accent text-white md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-[oklch(22%_0.06_250/0.32)] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={asideRef}
        className={cn(
          "sticky top-[53px] z-[var(--z-dropdown)] h-[calc(100vh-53px)] w-[250px] shrink-0 overflow-y-auto border-r border-border bg-surface py-5",
          "max-md:fixed max-md:left-0 max-md:top-[53px] max-md:z-[var(--z-modal)] max-md:h-[calc(100vh-53px)] max-md:border-r max-md:transition-transform max-md:duration-200 motion-reduce:max-md:transition-none",
          mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
      >
        <div className="px-4">
          <nav aria-label="Menu administrativo" className="flex flex-col gap-5">
            {NAV_SECTIONS.map((section) => {
              const items = section.items.filter((item) => !("adminOnly" in item && item.adminOnly && role !== "admin"));
              if (!items.length || (section.title === "Configurações" && role !== "admin")) return null;
              return (
              <div key={section.title}>
                <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted">
                  {section.title}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-bg hover:text-fg",
                            isActive && "bg-[oklch(94%_0.02_250)] font-semibold text-accent"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )})}
          </nav>
        </div>
      </aside>
    </>
  );
}
