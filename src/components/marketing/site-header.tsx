import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "./logo";

const links = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#plantillas", label: "Plantillas" },
  { href: "#precios", label: "Precios" },
  { href: "#plantillas-personalizadas", label: "A medida" },
  { href: "#preguntas", label: "Preguntas" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav
          aria-label="Principal"
          className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/ingresar" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Ingresar
          </Link>
          <Link
            href="/crear"
            data-track="cta_start"
            data-track-location="header"
            aria-label="Crear presupuesto"
            className={buttonVariants({ size: "lg" })}
          >
            <span className="sm:hidden">Crear</span>
            <span className="hidden sm:inline">Crear presupuesto</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
