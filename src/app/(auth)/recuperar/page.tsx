import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecuperarPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">Recuperá tu contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ingresá tu email y te enviamos un enlace para crear una nueva.
      </p>
      <div className="mt-6">
        <AuthForm
          action={forgotPasswordAction}
          submitLabel="Enviar enlace"
          fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
        />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link
          href="/ingresar"
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Volver a ingresar
        </Link>
      </p>
    </>
  );
}
