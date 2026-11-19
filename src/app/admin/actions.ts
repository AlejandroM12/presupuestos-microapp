"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminUser } from "@/server/auth/admin";
import {
  activateCustomTemplate,
  archiveCustomTemplate,
  assignCustomTemplateByEmail,
  createCustomTemplate,
  CustomTemplateError,
  duplicateCustomTemplate,
  revokeCustomTemplate,
  updateCustomTemplate,
} from "@/services/custom-templates";

const uuid = z.uuid();
const text = (form: FormData, key: string) => String(form.get(key) ?? "");

/** Cada acción revalida el rol de administrador en la base antes de operar. */
async function run(templateId: string | null, fn: (actorId: string) => Promise<string | void>) {
  const admin = await requireAdminUser();
  const base = templateId ? `/admin/plantillas/${templateId}` : "/admin/plantillas";
  let target = base;
  try {
    const result = await fn(admin.id);
    if (typeof result === "string") target = result;
    revalidatePath("/admin", "layout");
  } catch (error) {
    if (error instanceof CustomTemplateError) {
      redirect(`${base}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  redirect(target.includes("?") ? target : `${target}?ok=1`);
}

export async function createTemplateAction(form: FormData) {
  await run(null, async (actorId) => {
    const name = text(form, "name").trim();
    if (name.length < 2) throw new CustomTemplateError("invalid_config", "Ingresá un nombre");
    const created = await createCustomTemplate({
      name,
      description: text(form, "description"),
      actorId,
    });
    return `/admin/plantillas/${created.id}?ok=1`;
  });
}

export async function saveTemplateAction(form: FormData) {
  const id = uuid.parse(text(form, "id"));
  await run(id, async (actorId) => {
    let config: unknown;
    try {
      config = JSON.parse(text(form, "config"));
    } catch {
      throw new CustomTemplateError("invalid_config", "El JSON de configuración no es válido");
    }
    await updateCustomTemplate({
      templateId: id,
      name: text(form, "name"),
      description: text(form, "description"),
      config,
      actorId,
    });
  });
}

export async function activateTemplateAction(form: FormData) {
  const id = uuid.parse(text(form, "id"));
  await run(id, async (actorId) => {
    await activateCustomTemplate(id, actorId);
  });
}

export async function archiveTemplateAction(form: FormData) {
  const id = uuid.parse(text(form, "id"));
  await run(id, async (actorId) => {
    await archiveCustomTemplate(id, actorId);
  });
}

export async function duplicateTemplateAction(form: FormData) {
  const id = uuid.parse(text(form, "id"));
  await run(id, async (actorId) => {
    const copy = await duplicateCustomTemplate(id, actorId);
    return `/admin/plantillas/${copy.id}?ok=1`;
  });
}

export async function assignTemplateAction(form: FormData) {
  const id = uuid.parse(text(form, "id"));
  await run(id, async (actorId) => {
    await assignCustomTemplateByEmail({ templateId: id, email: text(form, "email"), actorId });
  });
}

export async function revokeAssignmentAction(form: FormData) {
  const id = uuid.parse(text(form, "id"));
  const userId = uuid.parse(text(form, "userId"));
  await run(id, async (actorId) => {
    await revokeCustomTemplate({
      templateId: id,
      userId,
      actorId,
      reason: text(form, "reason") || "Sin motivo indicado",
    });
  });
}
