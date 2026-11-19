"use client";

import { useEffect, useRef, useState } from "react";
import { quoteSchema, type QuoteDraft } from "@/domain/quote/schema";
import { PdfRequestError, requestQuotePdf } from "@/lib/pdf-client";
import { rasterizePdf } from "@/lib/pdf-raster";

const DEBOUNCE_MS = 900;

type Status = "idle" | "loading" | "ready" | "invalid" | "error";

/**
 * Vista previa fiel: pide al servidor el mismo PDF que se descargará (con marca de agua y sin
 * consumir cupo) y lo dibuja página por página. Se actualiza con debounce y cancela las
 * solicitudes obsoletas, para no regenerar el documento en cada pulsación.
 */
export function PdfPreview({ quote }: { quote: QuoteDraft }) {
  const [pages, setPages] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const urlsRef = useRef<string[]>([]);
  const serialized = JSON.stringify(quote);

  useEffect(() => {
    return () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    const parsed = quoteSchema.safeParse(JSON.parse(serialized));
    if (!parsed.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- refleja la validez del formulario
      setStatus("invalid");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const { blob } = await requestQuotePdf(parsed.data, {
          preview: true,
          signal: controller.signal,
        });
        const width = Math.min(containerRef.current?.clientWidth || 640, 794);
        const urls = await rasterizePdf(await blob.arrayBuffer(), width);
        if (controller.signal.aborted) {
          urls.forEach((u) => URL.revokeObjectURL(u));
          return;
        }
        urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        urlsRef.current = urls;
        setPages(urls);
        setStatus("ready");
      } catch (err) {
        if (controller.signal.aborted) return;
        setMessage(
          err instanceof PdfRequestError ? err.message : "No pudimos generar la vista previa.",
        );
        setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [serialized]);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[794px]" data-testid="pdf-preview">
      <p role="status" className="mb-2 text-xs text-muted-foreground">
        {status === "loading" && "Actualizando la vista previa…"}
        {status === "ready" && "Vista previa fiel del PDF. Se actualiza al editar."}
        {status === "invalid" && "Completá los datos obligatorios para ver la vista previa."}
        {status === "idle" && "Preparando la vista previa…"}
        {status === "error" && message}
      </p>
      <div className="space-y-4" aria-busy={status === "loading"}>
        {pages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- imagen generada en el cliente (blob)
          <img
            key={src}
            src={src}
            alt={`Página ${i + 1} de la vista previa`}
            className="w-full rounded-md border border-border bg-white shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}
