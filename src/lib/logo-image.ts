export const LOGO_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const LOGO_MAX_SIDE = 480;
export const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export class LogoError extends Error {}

/** Devuelve el tamaño final respetando proporción y sin ampliar. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function validateLogoFile(file: { type: string; size: number }): void {
  if (!(LOGO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    throw new LogoError("Usá una imagen PNG, JPG o WebP.");
  }
  if (file.size > LOGO_MAX_FILE_BYTES) {
    throw new LogoError("El logo no puede superar los 2 MB.");
  }
}

/** Valida el archivo, lo reduce a un máximo de 480 px y lo devuelve como data URL PNG. */
export async function processLogoFile(file: File): Promise<string> {
  validateLogoFile(file);
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new LogoError("No pudimos leer la imagen. Probá con otro archivo.");
  });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, LOGO_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoError("Tu navegador no pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
