import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { isResetTokenValid } from "@/services/auth";
import { resetPasswordAction } from "../../actions";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false },
  referrer: "no-referrer",
};

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = token.length <= 200 && (await isResetTokenValid(token));

  if (!valid) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold text-ink">Enlace no válido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El enlace venció o ya fue usado. Pedí uno nuevo.
        </p>
        <Link
          href="/recuperar"
          className="mt-6 inline-block text-sm font-medium text-ink underline underline-offset-4"
        >
          Pedir un enlace nuevo
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">Creá una nueva contraseña</h1>
      <div className="mt-6">
        <AuthForm
          action={resetPasswordAction}
          submitLabel="Guardar contraseña"
          hidden={{ token }}
          fields={[
            {
              name: "password",
              label: "Nueva contraseña",
              type: "password",
              autoComplete: "new-password",
              hint: "Mínimo 8 caracteres.",
            },
            {
              name: "confirm",
              label: "Repetí la contraseña",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />
      </div>
    </>
  );
}
