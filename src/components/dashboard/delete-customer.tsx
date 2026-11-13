"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCustomerAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function DeleteCustomerButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="lg" onClick={() => setConfirming(true)}>
        <Trash2 data-icon="inline-start" /> Eliminar cliente
      </Button>
    );
  }
  return (
    <form action={deleteCustomerAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-ink">
        Sus presupuestos se conservan con los datos que tenían. ¿Eliminar?
      </p>
      <Button type="submit" variant="destructive" size="lg">
        Sí, eliminar
      </Button>
      <Button type="button" variant="ghost" size="lg" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </form>
  );
}
