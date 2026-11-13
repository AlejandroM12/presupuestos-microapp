"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import {
  changePasswordAction,
  deleteAccountAction,
  updateNameAction,
  type SettingsState,
} from "@/app/dashboard/configuracion/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";

const initial: SettingsState = {};

function Feedback({ state }: { state: SettingsState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={state.ok ? "text-sm text-ink" : "text-sm text-destructive"}
    >
      {state.message}
    </p>
  );
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateNameAction, initial);
  return (
    <form action={action} noValidate className="space-y-4">
      <TextField
        id="s-name"
        name="name"
        label="Nombre"
        defaultValue={name}
        error={state.errors?.name}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-4">
      <TextField
        id="s-cur"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        label="Contraseña actual"
        error={e.currentPassword}
      />
      <TextField
        id="s-new"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        label="Nueva contraseña"
        hint="Mínimo 8 caracteres."
        error={e.newPassword}
      />
      <TextField
        id="s-conf"
        name="confirm"
        type="password"
        autoComplete="new-password"
        label="Repetí la nueva contraseña"
        error={e.confirm}
      />
      <p className="text-xs text-muted-foreground">
        Al cambiarla se cierran todas tus sesiones y vas a ingresar de nuevo.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Cambiar contraseña
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Se eliminan tu cuenta, presupuestos, clientes y datos del negocio, y se cancelan las
        suscripciones activas. No se puede deshacer. Descargá antes tus datos si los necesitás.
      </p>
      <TextField
        id="d-email"
        name="confirmEmail"
        label={`Escribí tu email (${email}) para confirmar`}
        error={e.confirmEmail}
        autoComplete="off"
      />
      <TextField
        id="d-pass"
        name="password"
        type="password"
        autoComplete="current-password"
        label="Contraseña"
        error={e.password}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="destructive" size="lg" className="h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Eliminar mi cuenta
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
