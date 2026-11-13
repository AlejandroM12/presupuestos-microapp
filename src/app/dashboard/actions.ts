"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { requirePro } from "@/server/pro";
import { deleteCustomer, createCustomer, updateCustomer } from "@/services/customers";
import { QUOTE_STATUSES, deleteQuote, duplicateQuote, setQuoteStatus } from "@/services/quotes";
import { NotFoundError } from "@/services/quotes";

const uuid = z.uuid();

function id(form: FormData, key = "id"): string {
  return uuid.parse(String(form.get(key) ?? ""));
}

/** Todas las acciones de escritura exigen Pro vigente y operan solo sobre recursos propios. */
export async function duplicateQuoteAction(form: FormData) {
  const user = await requirePro("/dashboard/presupuestos");
  const copy = await duplicateQuote(user.id, id(form));
  revalidatePath("/dashboard", "layout");
  redirect(`/crear?id=${copy.id}`);
}

export async function deleteQuoteAction(form: FormData) {
  const user = await requirePro("/dashboard/presupuestos");
  try {
    await deleteQuote(user.id, id(form));
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }
  revalidatePath("/dashboard", "layout");
}

export async function setQuoteStatusAction(form: FormData) {
  const user = await requirePro("/dashboard/presupuestos");
  const status = z.enum(QUOTE_STATUSES).parse(String(form.get("status") ?? ""));
  await setQuoteStatus(user.id, id(form), status);
  revalidatePath("/dashboard", "layout");
}

export interface CustomerFormState {
  errors?: Record<string, string | undefined>;
  message?: string;
  saved?: boolean;
}

function customerInput(form: FormData) {
  const field = (k: string) => String(form.get(k) ?? "");
  return {
    name: field("name"),
    company: field("company"),
    email: field("email"),
    phone: field("phone"),
    address: field("address"),
    taxId: field("taxId"),
  };
}

function zodErrors(error: z.ZodError) {
  const out: Record<string, string | undefined> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

export async function saveCustomerAction(
  _: CustomerFormState,
  form: FormData,
): Promise<CustomerFormState> {
  const user = await requirePro("/dashboard/clientes");
  const rawId = String(form.get("id") ?? "");
  try {
    if (rawId) {
      await updateCustomer(user.id, uuid.parse(rawId), customerInput(form));
      revalidatePath("/dashboard", "layout");
      return { saved: true, message: "Cambios guardados." };
    }
    const created = await createCustomer(user.id, customerInput(form));
    revalidatePath("/dashboard", "layout");
    redirect(`/dashboard/clientes/${created.id}`);
  } catch (error) {
    if (error instanceof z.ZodError) return { errors: zodErrors(error) };
    if (error instanceof NotFoundError) return { message: "El cliente ya no existe." };
    throw error; // incluye la excepción interna de redirect
  }
}

export async function deleteCustomerAction(form: FormData) {
  const user = await requirePro("/dashboard/clientes");
  try {
    await deleteCustomer(user.id, id(form));
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/clientes");
}

/** Cierra la sesión actual si la cuenta ya no existe (defensa ante cuentas borradas). */
export async function ensureSession() {
  await requireUser("/dashboard");
}
