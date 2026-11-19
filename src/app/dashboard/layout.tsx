import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { DashboardNav } from "@/components/dashboard/nav";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/server/auth/admin";
import { requireUserWithEntitlements } from "@/server/pro";
import { signOutAction } from "../(auth)/actions";

/** Todo /dashboard exige sesión: se valida en el servidor en cada solicitud. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, entitlements } = await requireUserWithEntitlements("/dashboard");
  const admin = await isAdmin(user.id);
  const plan = entitlements.proActive
    ? "Pro"
    : entitlements.ownsPremiumPack
      ? "Pack Premium"
      : "Gratis";

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          {admin && (
            <Link
              href="/admin/plantillas"
              className="text-xs font-medium text-brand hover:underline"
            >
              Administración
            </Link>
          )}
          <Link
            href="/dashboard/plan"
            className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-ink"
          >
            Plan {plan}
          </Link>
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="lg" aria-label="Cerrar sesión">
              <LogOut data-icon="inline-start" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </form>
        </div>
      </header>
      <div className="grid flex-1 gap-6 pb-16 pt-2 grid-cols-[minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <DashboardNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
