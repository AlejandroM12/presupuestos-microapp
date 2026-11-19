import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { isUuid } from "@/server/api";
import { CustomTemplateError, getCustomTemplateAdmin } from "@/services/custom-templates";
import {
  activateTemplateAction,
  archiveTemplateAction,
  assignTemplateAction,
  duplicateTemplateAction,
  revokeAssignmentAction,
  saveTemplateAction,
} from "../../actions";

export default async function AdminTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  if (!isUuid(id)) notFound();
  const template = await getCustomTemplateAdmin(id).catch((e) => {
    if (e instanceof CustomTemplateError) notFound();
    throw e;
  });
  const config = JSON.stringify(
    { style: template.style, fields: template.fields, sections: template.sections },
    null,
    2,
  );
  const active = template.assignments.filter((a) => !a.revokedAt);
  const history = template.assignments.filter((a) => a.revokedAt);
  const hidden = <input type="hidden" name="id" value={template.id} />;

  return (
    <>
      <PageHeader
        title={template.name}
        description={`${template.slug} · estado ${template.status} · versión publicada ${template.version}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/templates/${template.id}/preview`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-3 text-sm"
            >
              Vista previa PDF
            </a>
            <form action={duplicateTemplateAction}>
              {hidden}
              <Button type="submit" variant="outline" size="lg">
                Duplicar
              </Button>
            </form>
            {template.status !== "ARCHIVED" && (
              <form action={archiveTemplateAction}>
                {hidden}
                <Button type="submit" variant="outline" size="lg">
                  Archivar
                </Button>
              </form>
            )}
          </div>
        }
      />
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && !error && <p className="mb-4 text-sm text-emerald-700">Listo.</p>}

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-ink">Configuración</h2>
        <form action={saveTemplateAction} className="space-y-3">
          {hidden}
          <Field label="Nombre" htmlFor="name">
            <Input id="name" name="name" defaultValue={template.name} required />
          </Field>
          <Field label="Descripción" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={template.description} />
          </Field>
          <Field
            label="Estilo, campos y secciones (JSON)"
            htmlFor="config"
            hint="Solo datos: colores, tipografía (sans/serif/mono), textos de encabezado y pie, campos (text, textarea, number, date, select, checkbox, money) y secciones. Ver docs/custom-templates.md."
          >
            <Textarea
              id="config"
              name="config"
              defaultValue={config}
              spellCheck={false}
              className="min-h-72 font-mono text-xs"
            />
          </Field>
          <Button type="submit" size="lg" disabled={template.status === "ARCHIVED"}>
            Guardar cambios
          </Button>
        </form>
        {template.status !== "ARCHIVED" && (
          <form action={activateTemplateAction} className="mt-4 border-t border-border pt-4">
            {hidden}
            <p className="mb-2 text-xs text-muted-foreground">
              Publicar crea una versión inmutable: los presupuestos ya guardados conservan el diseño
              con el que se crearon.
            </p>
            <Button type="submit" variant="outline" size="lg">
              {template.status === "ACTIVE" ? "Publicar nueva versión" : "Activar"}
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Asignaciones</h2>
        <form action={assignTemplateAction} className="mb-4 flex flex-wrap items-end gap-3">
          {hidden}
          <Field label="Email de la cuenta" htmlFor="email" className="min-w-64 flex-1">
            <Input id="email" name="email" type="email" required />
          </Field>
          <Button type="submit" size="lg" disabled={template.status === "ARCHIVED"}>
            Asignar
          </Button>
        </form>
        <ul className="divide-y divide-border text-sm">
          {active.length === 0 && (
            <li className="py-2 text-muted-foreground">Sin asignaciones vigentes.</li>
          )}
          {active.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {a.user.email}{" "}
                <span className="text-xs text-muted-foreground">
                  desde {a.assignedAt.toISOString().slice(0, 10)}
                </span>
              </span>
              <form action={revokeAssignmentAction} className="flex items-center gap-2">
                {hidden}
                <input type="hidden" name="userId" value={a.user.id} />
                <Input
                  name="reason"
                  placeholder="Motivo"
                  className="h-9 w-44"
                  aria-label="Motivo de la revocación"
                />
                <Button type="submit" variant="outline" size="lg">
                  Revocar
                </Button>
              </form>
            </li>
          ))}
        </ul>
        {history.length > 0 && (
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              Historial de revocaciones ({history.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {history.map((a) => (
                <li key={a.id}>
                  {a.user.email} · revocada {a.revokedAt?.toISOString().slice(0, 10)}
                  {a.revokeReason ? ` · ${a.revokeReason}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    </>
  );
}
