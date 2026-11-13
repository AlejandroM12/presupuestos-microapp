"use client";

import { useRef } from "react";
import { Select } from "@/components/ui/fields";
import { setQuoteStatusAction } from "@/app/dashboard/actions";
import { STATUS_LABEL } from "@/components/dashboard/ui";
import type { QuoteStatus } from "@/generated/prisma/client";

/** Cambia el estado al elegir una opción (envía el formulario con la server action). */
export function StatusSelect({ id, status }: { id: string; status: QuoteStatus }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setQuoteStatusAction}>
      <input type="hidden" name="id" value={id} />
      <Select
        name="status"
        defaultValue={status}
        aria-label="Estado del presupuesto"
        className="h-8 w-32 text-xs"
        onChange={() => form.current?.requestSubmit()}
      >
        {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
    </form>
  );
}
