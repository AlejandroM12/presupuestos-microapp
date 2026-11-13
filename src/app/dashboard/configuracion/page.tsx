import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { DeleteAccountForm, NameForm, PasswordForm } from "@/components/dashboard/settings-forms";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Configuración", robots: { index: false } };

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/configuracion");
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Tus datos personales, seguridad y preferencias."
      />

      <div className="space-y-6">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Datos personales</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Email: {user.email}</p>
          <div className="mt-4 max-w-md">
            <NameForm name={user.name ?? ""} />
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Seguridad</h2>
          <div className="mt-4 max-w-md">
            <PasswordForm />
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Preferencias</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            La moneda, validez y condiciones por defecto de tus presupuestos se configuran en{" "}
            <a
              href="/dashboard/negocio"
              className="font-medium text-ink underline underline-offset-4"
            >
              Mi negocio
            </a>
            .
          </p>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Tus datos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Descargá una copia de toda tu información (cuenta, negocio, clientes, presupuestos y
            pagos) en formato JSON.
          </p>
          <a
            href="/api/account/export"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4" })}
          >
            <Download data-icon="inline-start" /> Exportar mis datos
          </a>
        </Card>

        <Card className="border-destructive/30">
          <h2 className="font-display text-lg font-semibold text-destructive">Eliminar cuenta</h2>
          <div className="mt-4 max-w-md">
            <DeleteAccountForm email={user.email} />
          </div>
        </Card>
      </div>
    </>
  );
}
