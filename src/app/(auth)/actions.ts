"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  safeNext,
  type FieldErrors,
} from "@/domain/auth";
import { clientIp, RateLimiter } from "@/server/rate-limit";
import {
  EmailTakenError,
  InvalidResetTokenError,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "@/services/auth";

export interface FormState {
  errors?: FieldErrors;
  message?: string;
  ok?: boolean;
  /** Valores no sensibles para repoblar el formulario (React limpia los campos tras la acción). */
  values?: Record<string, string>;
}

const REGISTER_LIMIT = Number(process.env.RATE_LIMIT_REGISTER_PER_HOUR) || 10;
const registerLimiter = new RateLimiter(REGISTER_LIMIT, 60 * 60_000);
const forgotLimiter = new RateLimiter(5, 60 * 60_000);
const resetLimiter = new RateLimiter(10, 60 * 60_000);

async function ip(): Promise<string> {
  return clientIp(await headers());
}

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

function keep(form: FormData, ...keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, text(form, k)]));
}

async function signInOrMessage(
  email: string,
  password: string,
  next: string,
): Promise<FormState | never> {
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code;
      return {
        message:
          code === "rate_limited"
            ? "Demasiados intentos. Esperá unos minutos antes de volver a probar."
            : "Email o contraseña incorrectos.",
      };
    }
    throw error; // el redirect de Next.js también se propaga como excepción
  }
  return {};
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: text(form, "email"),
    password: text(form, "password"),
  });
  const values = keep(form, "email");
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await signInOrMessage(
    parsed.data.email,
    parsed.data.password,
    safeNext(text(form, "next")),
  );
  return { ...result, values };
}

async function registerImpl(form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: text(form, "name"),
    email: text(form, "email"),
    password: text(form, "password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  if (!registerLimiter.check(await ip()).allowed) {
    return { message: "Demasiados registros desde esta conexión. Probá más tarde." };
  }
  try {
    await registerUser(parsed.data);
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { errors: { email: "Ya existe una cuenta con ese email. Probá iniciar sesión." } };
    }
    console.error("register_failed", error instanceof Error ? error.message : "unknown");
    return { message: "No pudimos crear la cuenta. Intentá nuevamente." };
  }
  return signInOrMessage(parsed.data.email, parsed.data.password, safeNext(text(form, "next")));
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  return { ...(await registerImpl(form)), values: keep(form, "name", "email") };
}

const NEUTRAL_FORGOT =
  "Si existe una cuenta con ese email, te enviamos un enlace para crear una nueva contraseña.";

async function forgotImpl(form: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: text(form, "email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const key = `${await ip()}|${parsed.data.email}`;
  if (!forgotLimiter.check(key).allowed) {
    return { message: "Ya pediste varios enlaces. Revisá tu correo o esperá un rato." };
  }
  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    // Se registra pero se responde igual, para no revelar si la cuenta existe.
    console.error(
      "password_reset_request_failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
  return { ok: true, message: NEUTRAL_FORGOT };
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  return { ...(await forgotImpl(form)), values: keep(form, "email") };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: text(form, "token"),
    password: text(form, "password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (text(form, "confirm") !== parsed.data.password) {
    return { errors: { confirm: "Las contraseñas no coinciden." } };
  }
  if (!resetLimiter.check(await ip()).allowed) {
    return { message: "Demasiados intentos. Probá más tarde." };
  }
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return { message: "El enlace venció o ya fue usado. Pedí uno nuevo." };
    }
    console.error("password_reset_failed", error instanceof Error ? error.message : "unknown");
    return { message: "No pudimos cambiar la contraseña. Intentá nuevamente." };
  }
  redirect("/ingresar?reset=1");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
