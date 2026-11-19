import { PageHeader } from "@/components/dashboard/ui";
import { listAuditLogs } from "@/services/custom-templates";

export default async function AuditPage() {
  const logs = await listAuditLogs(200);
  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Acciones administrativas, de la más reciente a la más antigua."
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Fecha (UTC)</th>
              <th className="p-3">Administrador</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Objeto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap p-3">
                  {l.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="p-3">{l.actor.email}</td>
                <td className="p-3">{l.action}</td>
                <td className="break-all p-3 text-xs text-muted-foreground">
                  {l.targetType} {l.targetId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
