"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { fieldErrors, passwordSchema } from "@/domain/auth";
import { requireUser } from "@/server/auth/session";
import { RateLimiter } from "@/server/rate-limit";
import {
  changePassword,
  deleteAccount,
  nameSchema,
  updateName,
  AdminAccountError,
  WrongPasswordError,
} from "@/services/account";
import { z } from "zod";

export interface SettingsState {
  errors?: Record<string, string | undefined>;
  message?: string;
  ok?: boolean;
}

const sensitiveLimiter = new RateLimiter(6, 15 * 60_000);
const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

export async function updateNameAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser("/dashboard/configuracion");
  const parsed = nameSchema.safeParse(text(form, "name"));
  if (!parsed.success) return { errors: { name: parsed.error.issues[0]?.message } };
  await updateName(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Datos actualizados." };
}

export async function changePasswordAction(
  _: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  const user = await requireUser("/dashboard/configuracion");
  if (!sensitiveLimiter.check(`pw:${user.id}`).allowed) {
    return { message: "Demasiados intentos. Esperá unos minutos." };
  }
  const next = text(form, "newPassword");
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { errors: { newPassword: parsed.error.issues[0]?.message } };
  if (text(form, "confirm") !== next)
    return { errors: { confirm: "Las contraseñas no coinciden." } };

  try {
    await changePassword(user.id, text(form, "currentPassword"), next);
  } catch (error) {
    if (error instanceof WrongPasswordError) {
      return { errors: { currentPassword: "La contraseña actual no es correcta." } };
    }
    if (error instanceof z.ZodError) return { errors: fieldErrors(error) };
    throw error;
  }
  // Todas las sesiones quedaron invalidadas: se vuelve a ingresar con la contraseña nueva.
  redirect("/ingresar?reset=1");
}

export async function deleteAccountAction(
  _: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  const user = await requireUser("/dashboard/configuracion");
  if (!sensitiveLimiter.check(`del:${user.id}`).allowed) {
    return { message: "Demasiados intentos. Esperá unos minutos." };
  }
  if (text(form, "confirmEmail").trim().toLowerCase() !== user.email) {
    return { errors: { confirmEmail: "Escribí tu email exactamente para confirmar." } };
  }
  try {
    await deleteAccount(user.id, text(form, "password"));
  } catch (error) {
    if (error instanceof WrongPasswordError) {
      return { errors: { password: "La contraseña no es correcta." } };
    }
    if (error instanceof AdminAccountError) {
      return {
        message:
          "Esta cuenta tiene rol de administrador. Pedí que se lo quiten antes de eliminarla.",
      };
    }
    throw error;
  }
  await signOut({ redirectTo: "/?cuenta=eliminada" });
  return { ok: true };
}
