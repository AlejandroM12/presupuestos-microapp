import Link from "next/link";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { listCustomTemplates } from "@/services/custom-templates";
import { createTemplateAction } from "../actions";

const STATUS = { DRAFT: "Borrador", ACTIVE: "Activa", ARCHIVED: "Archivada" } as const;

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const templates = await listCustomTemplates();
  return (
    <>
      <PageHeader
        title="Plantillas privadas"
        description="Diseños desarrollados para clientes concretos. Solo las cuentas asignadas pueden usarlos."
      />
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-ink">Nueva plantilla</h2>
        <form action={createTemplateAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="name">
            <Input id="name" name="name" required minLength={2} maxLength={80} />
          </Field>
          <Field label="Descripción" htmlFor="description">
            <Textarea id="description" name="description" maxLength={300} className="min-h-10" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">
              Crear borrador
            </Button>
          </div>
        </form>
      </Card>
      <ul className="divide-y divide-border rounded-xl border border-border bg-white">
        {templates.length === 0 && (
          <li className="p-5 text-sm text-muted-foreground">Todavía no hay plantillas.</li>
        )}
        {templates.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <Link
                href={`/admin/plantillas/${t.id}`}
                className="font-medium text-ink hover:underline"
              >
                {t.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {t.slug} · v{t.version} · {t._count.assignments} asignación(es)
              </p>
            </div>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">{STATUS[t.status]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
