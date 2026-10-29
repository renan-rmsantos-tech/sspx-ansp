"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  HeartHandshake,
  House,
  Landmark,
  LayoutTemplate,
  LogOut,
  Mail,
  Menu,
  Palette,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import { SealLogo } from "@/components/ui/seal-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APPLICATIONS, DONORS } from "./fixtures";
import { CountBadge } from "./ui";
import { InicioScreen } from "./screens/inicio";
import { SolicitacoesScreen } from "./screens/solicitacoes";
import { BenfeitoresScreen } from "./screens/benfeitores";
import { PagamentosScreen } from "./screens/pagamentos";
import { ComunicacoesScreen } from "./screens/comunicacoes";
import { RelatoriosScreen } from "./screens/relatorios";
import { ModelosScreen, CabecalhoScreen, AnoLetivoScreen, UsuariosScreen } from "./screens/configuracoes";
import { PadroesScreen } from "./screens/padroes";

export type Role = "admin" | "secretaria";

export type ScreenId =
  | "inicio"
  | "solicitacoes"
  | "ano-letivo"
  | "benfeitores"
  | "pagamentos"
  | "comunicacoes"
  | "relatorios"
  | "modelos"
  | "cabecalho"
  | "usuarios"
  | "padroes";

export interface ScreenProps {
  role: Role;
  onNavigate: (id: ScreenId) => void;
}

export const SCREENS: Record<ScreenId, ComponentType<ScreenProps>> = {
  inicio: InicioScreen,
  solicitacoes: SolicitacoesScreen,
  "ano-letivo": AnoLetivoScreen,
  benfeitores: BenfeitoresScreen,
  pagamentos: PagamentosScreen,
  comunicacoes: ComunicacoesScreen,
  relatorios: RelatoriosScreen,
  modelos: ModelosScreen,
  cabecalho: CabecalhoScreen,
  usuarios: UsuariosScreen,
  padroes: PadroesScreen,
};

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: number;
}

const pendingApplications = APPLICATIONS.filter((a) => a.status === "pendente").length;
const pendingWelcome = DONORS.filter((d) => d.boasVindas === "pendente").length;

const NAV: Array<{ title?: string; items: NavItem[] }> = [
  { items: [{ id: "inicio", label: "Início", icon: House }] },
  {
    title: "Bolsas",
    items: [
      { id: "solicitacoes", label: "Solicitações", icon: FileText, badge: pendingApplications },
      { id: "ano-letivo", label: "Ano letivo", icon: CalendarDays, adminOnly: true },
    ],
  },
  {
    title: "Benfeitores",
    items: [
      { id: "benfeitores", label: "Benfeitores", icon: HeartHandshake, badge: pendingWelcome },
      { id: "pagamentos", label: "Pagamentos", icon: Landmark, adminOnly: true },
      { id: "comunicacoes", label: "E-mails", icon: Mail, adminOnly: true },
      { id: "relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    title: "Configurações",
    items: [
      { id: "modelos", label: "Modelos de documentos", icon: ScrollText, adminOnly: true },
      { id: "cabecalho", label: "Cabeçalho e rodapé", icon: LayoutTemplate, adminOnly: true },
      { id: "usuarios", label: "Usuários", icon: Users, adminOnly: true },
    ],
  },
  {
    title: "Referência",
    items: [{ id: "padroes", label: "Padrões visuais", icon: Palette, adminOnly: true }],
  },
];

export function Shell({ screen, role, onNavigate }: { screen: ScreenId; role: Role; onNavigate: (id: ScreenId) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const Screen = SCREENS[screen];

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    asideRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const go = (id: ScreenId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-29px)] flex-col">
      <header
        className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6"
        data-od-id="topbar"
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md text-fg hover:bg-bg md:hidden"
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
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
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-fg">{role === "admin" ? "Pe. Coordenador" : "Secretaria"}</div>
            <div className="text-xs text-muted">{role === "admin" ? "Administração" : "Acesso da Secretaria"}</div>
          </div>
          <Button variant="outline" size="lg" className="gap-2" data-od-id="logout">
            <LogOut aria-hidden />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-fg/30 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
        <aside
          ref={asideRef}
          data-od-id="sidebar"
          className={cn(
            "w-[260px] shrink-0 border-r border-border bg-surface",
            "md:sticky md:top-14 md:h-[calc(100vh-56px)] md:overflow-y-auto",
            "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[var(--z-modal)] max-md:pt-14 max-md:transition-transform max-md:duration-200 motion-reduce:max-md:transition-none",
            mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
          )}
        >
          <nav aria-label="Menu administrativo" className="flex flex-col gap-6 px-3 py-5">
            {NAV.map((group, index) => {
              const items = group.items.filter((item) => !item.adminOnly || role === "admin");
              if (!items.length) return null;
              return (
                <div key={group.title ?? index}>
                  {group.title && (
                    <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {group.title}
                    </div>
                  )}
                  <ul className="flex flex-col gap-0.5">
                    {items.map((item) => {
                      const active = item.id === screen;
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <a
                            href={`#/${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              go(item.id);
                            }}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40",
                              active
                                ? "bg-accent text-white"
                                : "text-fg/80 hover:bg-bg hover:text-fg"
                            )}
                          >
                            <Icon className={cn("size-[18px] shrink-0", active ? "text-gold" : "text-muted")} />
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              active ? (
                                <span className="ml-auto text-xs font-semibold tabular-nums text-white/90">{item.badge}</span>
                              ) : (
                                <CountBadge>{item.badge}</CountBadge>
                              )
                            ) : null}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8" data-od-id="main">
          <div className="mx-auto w-full max-w-[1040px]">
            <Screen role={role} onNavigate={onNavigate} />
          </div>
        </main>
      </div>
    </div>
  );
}
