import { z } from "zod";

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "contraseña",
  "contrasena",
  "qwertyui",
  "qwerty123",
  "abc12345",
  "11111111",
  "00000000",
  "iloveyou",
  "admin123",
]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu email")
  .max(254, "Email demasiado largo")
  .pipe(z.email("Ingresá un email válido"));

export const passwordSchema = z
  .string()
  .min(8, "Usá al menos 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .refine((v) => v.trim().length > 0, "La contraseña no puede estar vacía")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "Esa contraseña es demasiado común");

export const registerSchema = z.object({
  name: z.string().trim().max(120, "Nombre demasiado largo").default(""),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

/**
 * Valida el destino posterior al login: solo rutas internas, sin esquemas ni hosts
 * (evita open redirect). Cualquier otro valor cae al destino por defecto.
 */
export function safeNext(value: string | null | undefined, fallback = "/crear"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export type FieldErrors = Record<string, string | undefined>;

/** Convierte los issues de Zod en un mapa campo -> primer mensaje. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
