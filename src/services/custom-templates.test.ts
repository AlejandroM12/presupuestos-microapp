import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeEntitlements, decidePdfRender } from "@/domain/entitlements";
import { defaultQuote } from "@/domain/quote/defaults";
import type { QuoteDraft } from "@/domain/quote/schema";
import { db } from "@/server/db";
import { deleteTestUsers } from "@/test/cleanup";
import { loadAccessContext } from "./access";
import {
  activateCustomTemplate,
  archiveCustomTemplate,
  assignCustomTemplate,
  assignCustomTemplateByEmail,
  createCustomTemplate,
  CustomTemplateError,
  duplicateCustomTemplate,
  listAssignedCustomTemplates,
  loadCustomRenderConfig,
  revokeCustomTemplate,
  updateCustomTemplate,
} from "./custom-templates";
import { createQuote, getQuote, NotFoundError, updateQuote } from "./quotes";

const enabled = !!process.env.TEST_DATABASE_URL;
const DOMAIN = "@ctpl-test.example";

const config = {
  style: { accentColor: "#0f766e", headerTitle: "Orden de trabajo" },
  sections: [{ id: "equipo", title: "Equipo", position: 0 }],
  fields: [
    { id: "serie", label: "N.º de serie", type: "text", required: true, sectionId: "equipo" },
    { id: "garantia", label: "En garantía", type: "checkbox" },
  ],
};

function draft(templateId: string, values: Record<string, string | boolean> = {}): QuoteDraft {
  const q = defaultQuote(new Date(2026, 4, 10));
  q.title = "Reparación";
  q.issuer = { ...q.issuer, businessName: "Taller" };
  q.customer = { ...q.customer, name: "Cliente" };
  q.items = [
    {
      id: "i1",
      description: "Mano de obra",
      quantity: "1",
      unit: "Unidad",
      unitPrice: "100",
      discountPercent: "0",
    },
  ];
  return { ...q, templateId, customFieldValues: values };
}

describe.skipIf(!enabled)("plantillas privadas (PostgreSQL)", () => {
  let admin: string;
  let alice: string;
  let bob: string;
  let tplId: string;

  beforeAll(async () => {
    const mk = (n: string, role: "USER" | "ADMIN" = "USER") =>
      db.user
        .create({ data: { email: `${n}${DOMAIN}`, passwordHash: "x", role } })
        .then((u) => u.id);
    admin = await mk("admin", "ADMIN");
    alice = await mk("alice");
    bob = await mk("bob");
    const t = await createCustomTemplate({
      name: "Taller",
      slug: "test-taller",
      config,
      actorId: admin,
    });
    tplId = t.id;
  });
  afterAll(async () => {
    await deleteTestUsers(DOMAIN);
  });

  it("una plantilla en borrador no es utilizable aunque esté asignada", async () => {
    await assignCustomTemplate({ templateId: tplId, userId: alice, actorId: admin });
    expect((await loadAccessContext(alice)).privateTemplateIds).toEqual([]);
    await revokeCustomTemplate({
      templateId: tplId,
      userId: alice,
      actorId: admin,
      reason: "prueba",
    });
  });

  it("rechaza configuraciones inválidas (HTML/JS no es un tipo de campo)", async () => {
    await expect(
      createCustomTemplate({
        name: "Mala",
        slug: "test-mala",
        actorId: admin,
        config: { fields: [{ id: "x", label: "X", type: "script" }] },
      }),
    ).rejects.toBeInstanceOf(CustomTemplateError);
  });

  it("activar publica una versión; asignar da acceso solo a esa cuenta", async () => {
    await activateCustomTemplate(tplId, admin);
    await assignCustomTemplateByEmail({
      templateId: tplId,
      email: `ALICE${DOMAIN}`,
      actorId: admin,
    });

    const a = await loadAccessContext(alice);
    const b = await loadAccessContext(bob);
    expect(a.privateTemplateIds).toEqual([tplId]);
    expect(b.privateTemplateIds).toEqual([]);

    expect(decidePdfRender(a, { templateId: tplId, preview: false })).toMatchObject({
      allowed: true,
      showBrand: false,
    });
    expect(decidePdfRender(b, { templateId: tplId, preview: false })).toEqual({
      allowed: false,
      reason: "template_locked",
    });
    expect((await listAssignedCustomTemplates(bob)).length).toBe(0);
    await expect(loadCustomRenderConfig(bob, tplId)).rejects.toBeInstanceOf(CustomTemplateError);
    await expect(
      assignCustomTemplate({ templateId: tplId, userId: alice, actorId: admin }),
    ).rejects.toMatchObject({ code: "already_assigned" });
  });

  it("no se puede guardar un presupuesto con la plantilla de otra cuenta", async () => {
    await expect(createQuote(bob, draft(tplId))).rejects.toBeInstanceOf(NotFoundError);
    const mine = await createQuote(alice, draft(tplId, { serie: "SN-1", garantia: true }));
    const saved = await getQuote(alice, mine.id);
    expect(saved.draft.customFieldValues).toEqual({ serie: "SN-1", garantia: true });
    expect(saved.customTemplateVersionId).not.toBeNull();
    await expect(updateQuote(bob, mine.id, draft(tplId))).rejects.toBeInstanceOf(NotFoundError);
  });

  it("los presupuestos guardados conservan la versión con la que se crearon", async () => {
    const q = await createQuote(alice, draft(tplId, { serie: "SN-2" }));
    const before = await getQuote(alice, q.id);

    await updateCustomTemplate({
      templateId: tplId,
      actorId: admin,
      config: { ...config, style: { accentColor: "#b91c1c", headerTitle: "Nueva cabecera" } },
    });
    const v2 = await activateCustomTemplate(tplId, admin);
    expect(v2.version).toBe(2);

    const old = await loadCustomRenderConfig(alice, tplId, before.customTemplateVersionId);
    expect(old.version).toBe(1);
    expect(old.style.headerTitle).toBe("Orden de trabajo");
    const current = await loadCustomRenderConfig(alice, tplId);
    expect(current.version).toBe(2);
    expect(current.style.headerTitle).toBe("Nueva cabecera");
  });

  it("revocar quita el acceso y queda auditado con motivo", async () => {
    await revokeCustomTemplate({
      templateId: tplId,
      userId: alice,
      actorId: admin,
      reason: "Fin de contrato",
    });
    expect((await loadAccessContext(alice)).privateTemplateIds).toEqual([]);
    const logs = await db.adminAuditLog.findMany({
      where: { actorId: admin, action: "ASSIGNMENT_REVOKE" },
    });
    expect(JSON.stringify(logs.map((l) => l.metadata))).toContain("Fin de contrato");
    await expect(
      revokeCustomTemplate({ templateId: tplId, userId: alice, actorId: admin, reason: "x" }),
    ).rejects.toMatchObject({ code: "not_assigned" });
  });

  it("cancelar Pro no afecta plantillas privadas; los límites siguen siendo los del plan", async () => {
    await assignCustomTemplate({ templateId: tplId, userId: bob, actorId: admin });
    const ctx = await loadAccessContext(bob);
    expect(ctx.proActive).toBe(false);
    const ent = computeEntitlements(ctx);
    expect(ent.privateTemplates).toEqual([tplId]);
    expect(ent.cloudFeatures).toBe(false);
    expect(ent.downloadLimit).toBe(3);
  });

  it("archivar bloquea el uso y la asignación; duplicar crea un borrador independiente", async () => {
    const copy = await duplicateCustomTemplate(tplId, admin);
    expect(copy.status).toBe("DRAFT");
    expect(copy.id).not.toBe(tplId);

    await archiveCustomTemplate(tplId, admin);
    expect((await loadAccessContext(bob)).privateTemplateIds).toEqual([]);
    await expect(
      assignCustomTemplate({ templateId: tplId, userId: alice, actorId: admin }),
    ).rejects.toMatchObject({ code: "archived" });
    await expect(
      updateCustomTemplate({ templateId: tplId, actorId: admin, name: "x" }),
    ).rejects.toMatchObject({ code: "archived" });
  });

  it("cada acción administrativa deja una entrada de auditoría", async () => {
    const actions = new Set(
      (await db.adminAuditLog.findMany({ where: { actorId: admin } })).map((l) => l.action),
    );
    for (const a of [
      "TEMPLATE_CREATE",
      "TEMPLATE_UPDATE",
      "TEMPLATE_ACTIVATE",
      "TEMPLATE_ARCHIVE",
      "TEMPLATE_DUPLICATE",
      "ASSIGNMENT_GRANT",
      "ASSIGNMENT_REVOKE",
    ]) {
      expect(actions.has(a as never)).toBe(true);
    }
  });

  it("altas simultáneas con el mismo nombre generan identificadores distintos", async () => {
    const made = await Promise.all(
      Array.from({ length: 5 }, () =>
        createCustomTemplate({ name: "Paralela", slug: "test-paralela", actorId: admin }),
      ),
    );
    expect(new Set(made.map((t) => t.slug)).size).toBe(5);
  });
});
