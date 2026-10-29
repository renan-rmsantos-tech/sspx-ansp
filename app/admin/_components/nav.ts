import {
  BarChart3,
  CalendarDays,
  FileText,
  HeartHandshake,
  House,
  Landmark,
  LayoutTemplate,
  Mail,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "@/lib/auth/authorization";

export type NavBadgeKey = "pendingApplications" | "pendingWelcome";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badge?: NavBadgeKey;
};

export type NavGroup = { title?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { items: [{ id: "inicio", label: "Início", href: "/admin", icon: House }] },
  {
    title: "Bolsas",
    items: [
      { id: "solicitacoes", label: "Solicitações", href: "/admin/solicitacoes", icon: FileText, badge: "pendingApplications" },
      { id: "ano-letivo", label: "Ano letivo", href: "/admin/ano-letivo", icon: CalendarDays, adminOnly: true },
    ],
  },
  {
    title: "Benfeitores",
    items: [
      { id: "benfeitores", label: "Benfeitores", href: "/admin/benfeitores", icon: HeartHandshake, badge: "pendingWelcome" },
      { id: "pagamentos", label: "Pagamentos", href: "/admin/pagamentos", icon: Landmark, adminOnly: true },
      { id: "emails", label: "E-mails", href: "/admin/emails", icon: Mail, adminOnly: true },
      { id: "relatorios", label: "Relatórios", href: "/admin/relatorios", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    title: "Configurações",
    items: [
      { id: "modelos", label: "Modelos de documentos", href: "/admin/modelos", icon: ScrollText, adminOnly: true },
      { id: "cabecalho", label: "Cabeçalho e rodapé", href: "/admin/cabecalho", icon: LayoutTemplate, adminOnly: true },
      { id: "usuarios", label: "Usuários", href: "/admin/usuarios", icon: Users, adminOnly: true },
    ],
  },
];

/** Grupos visíveis para o papel, sem itens `adminOnly` para a Secretaria e sem grupos vazios. */
export function navForRole(role: StaffRole): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => role === "admin" || !item.adminOnly),
  })).filter((group) => group.items.length > 0);
}

/** `/admin` só casa exato; os demais casam por prefixo de segmento. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
