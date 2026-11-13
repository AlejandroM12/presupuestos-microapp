import type { Metadata } from "next";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { signOutAction } from "../(auth)/actions";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Hola{user.name ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/crear" className={buttonVariants({ size: "lg" })}>
          Crear presupuesto
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="lg">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
