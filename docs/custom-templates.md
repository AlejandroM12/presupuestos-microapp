# Plantillas personalizadas (privadas)

Servicio comercial: diseños desarrollados para un cliente concreto, a cotizar por WhatsApp (`ATAJOLAB_WHATSAPP_E164`). Se contratan **independientemente del plan** y se conservan al cancelar Pro. No cambian los precios ni los límites de descarga: los PDF de una plantilla privada cuentan contra el cupo del plan de la cuenta (Gratis 3, Pack 20, Pro con uso razonable) y salen **sin marca de AtajoLab**.

## Modelo

| Tabla | Para qué |
| --- | --- |
| `custom_templates` | Plantilla: slug, nombre, estado (`DRAFT`/`ACTIVE`/`ARCHIVED`), versión publicada, estilo, campos y secciones (JSON) |
| `custom_template_versions` | Snapshot inmutable por versión publicada |
| `custom_template_assignments` | Qué cuenta puede usar qué plantilla (con quién la asignó, y quién/por qué la revocó) |
| `admin_audit_logs` | Auditoría de acciones administrativas |
| `users.role` | `USER` (por defecto) o `ADMIN` |
| `quotes.customFieldValues`, `quotes.customTemplateVersionId` | Valores de los campos y versión con la que se guardó el presupuesto |

La plantilla es **solo datos** validados con Zod (`src/domain/custom-template/config.ts`): nunca HTML, CSS ni código. Un solo renderer genérico (`src/services/pdf/templates/custom.tsx`) dibuja encabezado, datos del cliente, campos por sección, tabla de conceptos, totales, condiciones y pie.

## Configuración (JSON)

```json
{
  "style": {
    "accentColor": "#b91c1c",
    "fontFamily": "sans | serif | mono",
    "headerTitle": "Orden de trabajo",
    "headerSubtitle": "Taller Rojas · Mecánica integral",
    "footerText": "Garantía de 90 días sobre mano de obra.",
    "showLogo": true
  },
  "sections": [{ "id": "vehiculo", "title": "Datos del vehículo", "position": 0 }],
  "fields": [
    { "id": "patente", "label": "Patente", "type": "text", "sectionId": "vehiculo", "required": true, "position": 0 },
    { "id": "km", "label": "Kilometraje", "type": "number", "min": 0, "position": 1 },
    { "id": "seguro", "label": "Cobertura de seguro", "type": "checkbox", "position": 2 },
    { "id": "interno", "label": "Nota interna", "type": "text", "showInPdf": false }
  ]
}
```

Tipos de campo: `text`, `textarea`, `number`, `date`, `select` (con `options`), `checkbox`, `money`. Los `id` son `[a-z][a-z0-9_]*`. Límites: 80 campos, 30 secciones. Los campos vacíos no se imprimen; los `showInPdf: false` quedan solo en el presupuesto guardado.

## Procedimiento: crear y asignar una plantilla

1. **Otorgar rol de administrador** (una sola vez, a una cuenta existente). No hay administrador por defecto ni forma de autoasignarse el rol desde la aplicación:
   `docker exec presupuestos-db psql -U presupuestos -d presupuestos -c "UPDATE users SET role='ADMIN' WHERE email='tu@email';"`
   (o `node scripts/grant-admin.mjs <email>` con `DATABASE_URL` en un entorno con el repositorio). Quitar el rol: mismo `UPDATE` con `'USER'`; surte efecto en la siguiente solicitud porque el rol se consulta en la base cada vez.
2. Entrar a **/admin/plantillas** → "Nueva plantilla" (queda en borrador).
3. Editar el JSON de estilo/campos/secciones → "Guardar cambios".
4. **Vista previa PDF**: botón en la ficha (datos de ejemplo; también en borrador). Iterar hasta aprobar el diseño con el cliente.
5. **Activar**: crea la versión 1 (inmutable). Una plantilla en borrador no la puede usar nadie aunque esté asignada.
6. **Asignar** por email de la cuenta del cliente. El cliente verá "Mis plantillas" en el dashboard y en el editor, con sus campos.
7. Cambios posteriores: editar → "Publicar nueva versión". Los presupuestos ya guardados siguen dibujándose con su versión original; los nuevos usan la última.
8. **Revocar** (con motivo) cuando termina el servicio: el acceso se corta al instante. **Archivar** retira la plantilla para todos.

Cada acción administrativa queda en **/admin/auditoria**.

## Seguridad

- `/admin` y `/api/admin/*`: 404 para anónimos y usuarios comunes en páginas (401 sin sesión en la API); el rol se verifica en la base en cada solicitud y en cada acción de servidor.
- Los permisos de uso se calculan en el servidor a partir de asignaciones vigentes de la sesión: una cuenta sin asignación recibe la misma respuesta que ante un diseño bloqueado (no se revela si la plantilla existe), también en vista previa.
- Guardar un presupuesto con una plantilla privada exige asignación vigente; `/api/me/templates` devuelve solo las propias.
- Un administrador no puede eliminar su cuenta mientras tenga el rol (protege la auditoría).

## Pruebas

`src/services/custom-templates.test.ts` (aislamiento, versionado, revocación, archivo, auditoría), `src/services/pdf/custom-render.test.ts` (PDF con campos, multipágina), `src/domain/entitlements.test.ts` y `e2e/private-templates.spec.ts` (administración, aislamiento entre usuarios, escalamiento de privilegios).

## Pendiente

- La edición es por JSON (no hay editor visual de campos); la vista previa del editor de HTML en pantalla no replica el diseño exacto del PDF privado (usa el color de acento).
- El logo del negocio sigue siendo el del perfil; no hay assets propios por plantilla.
