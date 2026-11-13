import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/domain/auth";
import { getCurrentUser } from "@/server/auth/session";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  const target = safeNext(next);
  if (await getCurrentUser()) redirect(target);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">Ingresá a tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Para descargar tus presupuestos y gestionar tu plan.
      </p>
      {reset === "1" && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-ink"
        >
          Cambiaste tu contraseña. Ya podés ingresar con la nueva.
        </p>
      )}
      <div className="mt-6">
        <AuthForm
          action={loginAction}
          submitLabel="Ingresar"
          hidden={{ next: target }}
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            {
              name: "password",
              label: "Contraseña",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
          afterFields={
            <p className="text-right text-sm">
              <Link
                href="/recuperar"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Olvidé mi contraseña
              </Link>
            </p>
          }
        />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link
          href={`/registro?next=${encodeURIComponent(target)}`}
          className="font-medium text-ink underline underline-offset-4"
        >
          Crear cuenta gratis
        </Link>
      </p>
    </>
  );
}
