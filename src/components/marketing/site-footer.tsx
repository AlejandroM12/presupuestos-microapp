import { siteConfig } from "@/lib/config/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-xs">
            Los documentos generados son presupuestos comerciales y no tienen validez fiscal.
          </p>
        </div>
        <nav aria-label="AtajoLab" className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={siteConfig.parentUrl} className="hover:text-foreground">
            AtajoLab
          </a>
          <a href={siteConfig.catalogUrl} className="hover:text-foreground">
            Otras microapps
          </a>
          <a href="#precios" className="hover:text-foreground">
            Precios
          </a>
          <a href="#preguntas" className="hover:text-foreground">
            Preguntas
          </a>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} AtajoLab</p>
      </div>
    </footer>
  );
}
