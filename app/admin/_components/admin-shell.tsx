"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { logout } from "@/app/login/_actions/auth-actions";
import { Button } from "@/components/ui/button";
import { SealLogo } from "@/components/ui/seal-logo";
import type { StaffRole } from "@/lib/auth/authorization";
import { cn } from "@/lib/utils";
import { CountBadge } from "./count-badge";
import { isActive, navForRole, type NavBadgeKey } from "./nav";

export type AdminShellCounts = Record<NavBadgeKey, number>;

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administração",
  secretaria: "Secretaria",
};

/**
 * Casca do painel: barra superior (menu mobile, selo, usuário, Sair), menu
 * lateral com os grupos de `nav.ts` e contadores, e `main` com 1040px.
 * Contadores indisponíveis (`counts === null`) só omitem os badges.
 */
export function AdminShell({
  staff,
  counts,
  children,
}: {
  staff: { email: string; role: StaffRole };
  counts: AdminShellCounts | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, startLogout] = useTransition();
  const asideRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const groups = navForRole(staff.role);

  // Menu mobile aberto se comporta como diálogo: foco entra no menu, Tab
  // circula dentro dele, Escape fecha e devolve o foco ao botão.
  useEffect(() => {
    if (!mobileOpen) return;
    const aside = asideRef.current;
    if (!aside) return;

    const focusables = () =>
      Array.from(aside.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !aside.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !aside.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function badgeFor(badge: NavBadgeKey | undefined): number {
    if (!badge || !counts) return 0;
    if (badge === "pendingWelcome" && staff.role !== "admin") return 0;
    return counts[badge] > 0 ? counts[badge] : 0;
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={toggleRef}
            type="button"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-md text-fg outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent/40 md:hidden"
          >
            {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
          <SealLogo size={30} decorative />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted max-sm:hidden">
              Arca N. S. da Providência
            </div>
            <div className="truncate font-heading text-base font-semibold text-fg">Administração</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block" data-testid="shell-user">
            <div className="truncate text-sm font-medium text-fg">{staff.email}</div>
            <div className="text-xs text-muted">{ROLE_LABELS[staff.role]}</div>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            disabled={loggingOut}
            onClick={() => startLogout(() => logout())}
          >
            <LogOut aria-hidden="true" />
            {loggingOut ? "Saindo…" : "Sair"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-fg/30 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          ref={asideRef}
          className={cn(
            "w-[260px] shrink-0 border-r border-border bg-surface",
            "md:sticky md:top-14 md:h-[calc(100vh-56px)] md:overflow-y-auto",
            "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[var(--z-modal)] max-md:overflow-y-auto max-md:pt-14 max-md:transition-transform max-md:duration-200 motion-reduce:max-md:transition-none",
            mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
          )}
        >
          <nav aria-label="Menu administrativo" className="flex flex-col gap-6 px-3 py-5">
            {groups.map((group, index) => (
              <div key={group.title ?? index}>
                {group.title && (
                  <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {group.title}
                  </div>
                )}
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const count = badgeFor(item.badge);
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 motion-reduce:transition-none",
                            active ? "bg-accent text-white" : "text-fg/80 hover:bg-bg hover:text-fg"
                          )}
                        >
                          <Icon aria-hidden="true" className={cn("size-[18px] shrink-0", active ? "text-gold" : "text-muted")} />
                          <span className="truncate">{item.label}</span>
                          {count > 0 && (
                            <>
                              {" "}
                              <CountBadge className={cn("ml-auto", active && "bg-white/15 text-white")}>
                                {count}
                              </CountBadge>
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1040px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
