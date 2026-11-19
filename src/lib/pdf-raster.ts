"use client";

/** Rasteriza las páginas de un PDF con pdf.js (se carga recién al mostrar esta vista). */
export async function rasterizePdf(data: ArrayBuffer, cssWidth: number): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await task.promise;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const urls: string[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (cssWidth * dpr) / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) urls.push(URL.createObjectURL(blob));
    }
  } finally {
    await task.destroy();
  }
  return urls;
}
