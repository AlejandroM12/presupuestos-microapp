"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { saveCustomerAction, type CustomerFormState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";

interface Props {
  customer?: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    taxId: string;
  };
  disabled?: boolean;
}

const initial: CustomerFormState = {};

export function CustomerForm({ customer, disabled }: Props) {
  const [state, action, pending] = useActionState(saveCustomerAction, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      {state.message && (
        <p
          role={state.saved ? "status" : "alert"}
          className={
            state.saved
              ? "rounded-lg border border-border bg-muted/50 p-3 text-sm text-ink sm:col-span-2"
              : "rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:col-span-2"
          }
        >
          {state.message}
        </p>
      )}
      <TextField
        id="c-name"
        name="name"
        label="Nombre"
        defaultValue={customer?.name}
        error={e.name}
        disabled={disabled}
      />
      <TextField
        id="c-company"
        name="company"
        label="Empresa (opcional)"
        defaultValue={customer?.company}
        error={e.company}
        disabled={disabled}
      />
      <TextField
        id="c-email"
        name="email"
        type="email"
        label="Email"
        defaultValue={customer?.email}
        error={e.email}
        disabled={disabled}
      />
      <TextField
        id="c-phone"
        name="phone"
        type="tel"
        label="Teléfono"
        defaultValue={customer?.phone}
        error={e.phone}
        disabled={disabled}
      />
      <TextField
        id="c-address"
        name="address"
        label="Dirección (opcional)"
        defaultValue={customer?.address}
        error={e.address}
        disabled={disabled}
      />
      <TextField
        id="c-taxid"
        name="taxId"
        label="CUIT/DNI (opcional)"
        defaultValue={customer?.taxId}
        error={e.taxId}
        disabled={disabled}
      />
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" className="h-10" disabled={pending || disabled}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          {customer ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
