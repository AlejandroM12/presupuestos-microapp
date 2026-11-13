import type { Quote } from "@/domain/quote/schema";

export class PdfRequestError extends Error {}

function fileNameFrom(response: Response): string {
  const header = response.headers.get("content-disposition") ?? "";
  return /filename="([^"]+)"/.exec(header)?.[1] ?? "Presupuesto.pdf";
}

/** Pide el PDF al servidor. El servidor valida de nuevo el presupuesto y los permisos. */
export async function requestQuotePdf(quote: Quote): Promise<{ blob: Blob; fileName: string }> {
  let response: Response;
  try {
    response = await fetch("/api/quotes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quote),
    });
  } catch {
    throw new PdfRequestError("No hay conexión. Revisá tu internet e intentá otra vez.");
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new PdfRequestError(data?.error ?? "No pudimos generar el PDF.");
  }
  return { blob: await response.blob(), fileName: fileNameFrom(response) };
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Comparte el PDF mediante el menú nativo del dispositivo, si el navegador lo permite. */
export async function sharePdfNatively(
  blob: Blob,
  fileName: string,
  text: string,
): Promise<boolean> {
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (typeof navigator === "undefined" || !navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], text });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }
}

export function canShareFilesNatively(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([""], "x.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}
