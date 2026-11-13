"use client";

import {
  CreditCard,
  FileText,
  Home,
  LayoutTemplate,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard", label: "Inicio", icon: Home, exact: true },
  { href: "/dashboard/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/negocio", label: "Mi negocio", icon: Store },
  { href: "/dashboard/plantillas", label: "Plantillas", icon: LayoutTemplate },
  { href: "/dashboard/plan", label: "Mi plan", icon: CreditCard },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Dashboard"
      className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-ink text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
