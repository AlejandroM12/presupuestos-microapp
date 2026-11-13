import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/domain/auth";
import { getCurrentUser } from "@/server/auth/session";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const target = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(target);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">Creá tu cuenta gratis</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Descargá hasta 3 presupuestos por mes sin costo.
      </p>
      <div className="mt-6">
        <AuthForm
          action={registerAction}
          submitLabel="Crear cuenta"
          hidden={{ next: target }}
          fields={[
            { name: "name", label: "Nombre (opcional)", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            {
              name: "password",
              label: "Contraseña",
              type: "password",
              autoComplete: "new-password",
              hint: "Mínimo 8 caracteres.",
            },
          ]}
        />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={`/ingresar?next=${encodeURIComponent(target)}`}
          className="font-medium text-ink underline underline-offset-4"
        >
          Ingresar
        </Link>
      </p>
    </>
  );
}
