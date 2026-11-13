"use client";

import { Copy, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteQuoteAction, duplicateQuoteAction } from "@/app/dashboard/actions";

/** Acciones por fila. Sin Pro vigente solo quedan activas ver/descargar (modo lectura). */
export function QuoteRowActions({ id, canWrite }: { id: string; canWrite: boolean }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Link
        href={`/crear?id=${id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        aria-label={canWrite ? "Editar presupuesto" : "Ver presupuesto"}
      >
        <Pencil data-icon="inline-start" /> {canWrite ? "Editar" : "Ver"}
      </Link>
      <a
        href={`/api/quotes/${id}/pdf`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        aria-label="Descargar PDF"
      >
        <Download data-icon="inline-start" /> PDF
      </a>
      {canWrite && (
        <>
          <form action={duplicateQuoteAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="ghost" size="sm" aria-label="Duplicar presupuesto">
              <Copy data-icon="inline-start" /> Duplicar
            </Button>
          </form>
          {confirming ? (
            <form action={deleteQuoteAction} className="flex items-center gap-1">
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive" size="sm">
                Confirmar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Eliminar presupuesto"
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" /> Eliminar
            </Button>
          )}
        </>
      )}
    </div>
  );
}
