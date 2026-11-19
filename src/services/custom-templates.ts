import type { CustomTemplateConfig } from "@/domain/custom-template/config";
import { parseCustomTemplateConfig } from "@/domain/custom-template/config";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export class CustomTemplateError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "archived"
      | "already_assigned"
      | "not_assigned"
      | "invalid_config"
      | "forbidden",
    message: string,
  ) {
    super(message);
  }
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function listAssignedCustomTemplates(userId: string) {
  const rows = await db.customTemplateAssignment.findMany({
    where: { userId, revokedAt: null, template: { status: "ACTIVE" } },
    include: {
      template: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          version: true,
          style: true,
          fields: true,
          sections: true,
          showBrand: true,
          rendererKey: true,
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });
  return rows.map((r) => r.template);
}

export async function getUsableCustomTemplate(userId: string, templateId: string) {
  const assignment = await db.customTemplateAssignment.findFirst({
    where: {
      userId,
      templateId,
      revokedAt: null,
      template: { status: "ACTIVE" },
    },
    include: { template: true },
  });
  if (!assignment) throw new CustomTemplateError("not_found", "Plantilla no disponible");
  return assignment.template;
}

export async function createCustomTemplate(input: {
  name: string;
  description?: string;
  slug?: string;
  config?: unknown;
  actorId: string;
}) {
  let config: CustomTemplateConfig;
  try {
    config = parseCustomTemplateConfig(input.config ?? {});
  } catch {
    throw new CustomTemplateError("invalid_config", "Configuración inválida");
  }

  const baseSlug = input.slug?.trim() || slugify(input.name) || "plantilla";
  const data = {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    style: json(config.style),
    fields: json(config.fields),
    sections: json(config.sections),
    status: "DRAFT" as const,
    version: 1,
  };

  // El slug es único: ante una colisión (también entre altas simultáneas) se reintenta con sufijo.
  let template: Awaited<ReturnType<typeof db.customTemplate.create>> | undefined;
  for (let i = 0; i < 8 && !template; i++) {
    const slug =
      i === 0 ? baseSlug : `${baseSlug}-${i === 1 ? 2 : Math.random().toString(36).slice(2, 6)}`;
    try {
      template = await db.customTemplate.create({ data: { ...data, slug } });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  if (!template)
    throw new CustomTemplateError("invalid_config", "No se pudo generar un identificador único");

  await db.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: "TEMPLATE_CREATE",
      targetType: "custom_template",
      targetId: template.id,
      metadata: { slug: template.slug, name: template.name },
    },
  });

  return template;
}

export async function updateCustomTemplate(input: {
  templateId: string;
  name?: string;
  description?: string;
  config?: unknown;
  actorId: string;
}) {
  const existing = await db.customTemplate.findUnique({ where: { id: input.templateId } });
  if (!existing) throw new CustomTemplateError("not_found", "Plantilla no encontrada");
  if (existing.status === "ARCHIVED") {
    throw new CustomTemplateError("archived", "La plantilla está archivada");
  }

  let style: unknown = existing.style;
  let fields: unknown = existing.fields;
  let sections: unknown = existing.sections;
  if (input.config !== undefined) {
    try {
      const config = parseCustomTemplateConfig(input.config);
      style = config.style;
      fields = config.fields;
      sections = config.sections;
    } catch {
      throw new CustomTemplateError("invalid_config", "Configuración inválida");
    }
  }

  const template = await db.customTemplate.update({
    where: { id: input.templateId },
    data: {
      name: input.name?.trim() ?? existing.name,
      description: input.description?.trim() ?? existing.description,
      style: json(style),
      fields: json(fields),
      sections: json(sections),
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: "TEMPLATE_UPDATE",
      targetType: "custom_template",
      targetId: template.id,
      metadata: { version: template.version },
    },
  });

  return template;
}

/** Publica la configuración actual como versión inmutable y deja la plantilla ACTIVE. */
export async function activateCustomTemplate(templateId: string, actorId: string) {
  const existing = await db.customTemplate.findUnique({ where: { id: templateId } });
  if (!existing) throw new CustomTemplateError("not_found", "Plantilla no encontrada");

  const nextVersion = existing.status === "ACTIVE" ? existing.version + 1 : existing.version;

  const template = await db.$transaction(async (tx) => {
    await tx.customTemplateVersion.upsert({
      where: {
        templateId_version: { templateId, version: nextVersion },
      },
      create: {
        templateId,
        version: nextVersion,
        name: existing.name,
        style: json(existing.style),
        fields: json(existing.fields),
        sections: json(existing.sections),
        showBrand: existing.showBrand,
      },
      update: {
        name: existing.name,
        style: json(existing.style),
        fields: json(existing.fields),
        sections: json(existing.sections),
        showBrand: existing.showBrand,
      },
    });
    return tx.customTemplate.update({
      where: { id: templateId },
      data: { status: "ACTIVE", version: nextVersion },
    });
  });

  await db.adminAuditLog.create({
    data: {
      actorId,
      action: "TEMPLATE_ACTIVATE",
      targetType: "custom_template",
      targetId: templateId,
      metadata: { version: nextVersion },
    },
  });

  return template;
}

export async function archiveCustomTemplate(templateId: string, actorId: string) {
  const existing = await db.customTemplate.findUnique({ where: { id: templateId } });
  if (!existing) throw new CustomTemplateError("not_found", "Plantilla no encontrada");

  const template = await db.customTemplate.update({
    where: { id: templateId },
    data: { status: "ARCHIVED" },
  });

  await db.adminAuditLog.create({
    data: {
      actorId,
      action: "TEMPLATE_ARCHIVE",
      targetType: "custom_template",
      targetId: templateId,
      metadata: {},
    },
  });

  return template;
}

export async function assignCustomTemplate(input: {
  templateId: string;
  userId: string;
  actorId: string;
}) {
  const template = await db.customTemplate.findUnique({ where: { id: input.templateId } });
  if (!template) throw new CustomTemplateError("not_found", "Plantilla no encontrada");
  if (template.status === "ARCHIVED") {
    throw new CustomTemplateError("archived", "No se puede asignar una plantilla archivada");
  }

  const active = await db.customTemplateAssignment.findFirst({
    where: { templateId: input.templateId, userId: input.userId, revokedAt: null },
  });
  if (active) throw new CustomTemplateError("already_assigned", "Ya está asignada a este usuario");

  const assignment = await db.customTemplateAssignment.create({
    data: {
      templateId: input.templateId,
      userId: input.userId,
      assignedById: input.actorId,
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: "ASSIGNMENT_GRANT",
      targetType: "custom_template_assignment",
      targetId: assignment.id,
      metadata: { templateId: input.templateId, userId: input.userId },
    },
  });

  return assignment;
}

export async function revokeCustomTemplate(input: {
  templateId: string;
  userId: string;
  actorId: string;
  reason: string;
}) {
  const active = await db.customTemplateAssignment.findFirst({
    where: { templateId: input.templateId, userId: input.userId, revokedAt: null },
  });
  if (!active) throw new CustomTemplateError("not_assigned", "No hay asignación activa");

  const assignment = await db.customTemplateAssignment.update({
    where: { id: active.id },
    data: {
      revokedAt: new Date(),
      revokeReason: input.reason.trim().slice(0, 500),
      revokedById: input.actorId,
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: "ASSIGNMENT_REVOKE",
      targetType: "custom_template_assignment",
      targetId: assignment.id,
      metadata: {
        templateId: input.templateId,
        userId: input.userId,
        reason: input.reason.trim().slice(0, 500),
      },
    },
  });

  return assignment;
}

/** Snapshot de versión para persistir en un presupuesto guardado. */
export async function resolveCustomTemplateVersionId(templateId: string): Promise<string | null> {
  const template = await db.customTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, version: true, status: true },
  });
  if (!template || template.status !== "ACTIVE") return null;
  const version = await db.customTemplateVersion.findUnique({
    where: { templateId_version: { templateId, version: template.version } },
    select: { id: true },
  });
  return version?.id ?? null;
}

/**
 * Configuración con la que se dibuja el PDF de un presupuesto: exige asignación vigente y usa la
 * versión publicada que el presupuesto ya tenía (o la actual si es nuevo), de modo que los
 * presupuestos históricos conservan su diseño aunque la plantilla evolucione.
 */
export async function loadCustomRenderConfig(
  userId: string,
  templateId: string,
  versionId?: string | null,
) {
  const template = await getUsableCustomTemplate(userId, templateId);
  const snapshot =
    (versionId
      ? await db.customTemplateVersion.findFirst({ where: { id: versionId, templateId } })
      : null) ??
    (await db.customTemplateVersion.findUnique({
      where: { templateId_version: { templateId, version: template.version } },
    }));
  const source = snapshot ?? template;
  const config = parseCustomTemplateConfig({
    style: source.style,
    fields: source.fields,
    sections: source.sections,
  });
  return {
    name: source.name,
    version: snapshot?.version ?? template.version,
    showBrand: source.showBrand,
    ...config,
  };
}

export async function duplicateCustomTemplate(templateId: string, actorId: string) {
  const source = await db.customTemplate.findUnique({ where: { id: templateId } });
  if (!source) throw new CustomTemplateError("not_found", "Plantilla no encontrada");
  const copy = await createCustomTemplate({
    name: `${source.name} (copia)`,
    description: source.description,
    config: { style: source.style, fields: source.fields, sections: source.sections },
    actorId,
  });
  await db.adminAuditLog.create({
    data: {
      actorId,
      action: "TEMPLATE_DUPLICATE",
      targetType: "custom_template",
      targetId: copy.id,
      metadata: { sourceId: templateId },
    },
  });
  return copy;
}

export async function listCustomTemplates() {
  return db.customTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assignments: { where: { revokedAt: null } } } } },
  });
}

export async function getCustomTemplateAdmin(templateId: string) {
  const template = await db.customTemplate.findUnique({
    where: { id: templateId },
    include: {
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!template) throw new CustomTemplateError("not_found", "Plantilla no encontrada");
  return template;
}

/** Asigna por email (el administrador no necesita conocer el id interno de la cuenta). */
export async function assignCustomTemplateByEmail(input: {
  templateId: string;
  email: string;
  actorId: string;
}) {
  const user = await db.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new CustomTemplateError("not_found", "No existe una cuenta con ese email");
  return assignCustomTemplate({
    templateId: input.templateId,
    userId: user.id,
    actorId: input.actorId,
  });
}

export async function listAuditLogs(take = 100) {
  return db.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { email: true } } },
  });
}
