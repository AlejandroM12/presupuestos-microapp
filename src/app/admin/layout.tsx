import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminUser } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Todo /admin exige rol ADMIN verificado en la base; si no, 404. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminUser();
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <nav aria-label="Administración" className="flex gap-4 text-sm font-medium">
          <Link href="/admin/plantillas">Plantillas privadas</Link>
          <Link href="/admin/auditoria">Auditoría</Link>
          <Link href="/dashboard" className="text-muted-foreground">
            Volver al dashboard
          </Link>
        </nav>
        <span className="text-xs text-muted-foreground">Admin: {admin.email}</span>
      </header>
      {children}
    </div>
  );
}
