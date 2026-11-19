# Administración

Consola interna en `/admin` para gestionar plantillas privadas. No es pública: para cualquier persona sin rol ADMIN responde 404.

## Roles y acceso

- Roles: `USER` (por defecto) y `ADMIN`. **No existe administrador por defecto** ni forma de autoasignarse el rol desde la aplicación.
- El rol se lee de la base de datos en cada solicitud (páginas, acciones de servidor y `/api/admin/*`); no se guarda en el token de sesión. Quitar el rol corta el acceso en la siguiente solicitud.
- Otorgar (una cuenta existente), en el VPS:
  `docker exec presupuestos-db psql -U presupuestos -d presupuestos -c "UPDATE users SET role='ADMIN' WHERE email='tu@email';"`
  Quitar: igual con `'USER'`. Las altas/bajas hechas por SQL no quedan en la auditoría de la aplicación; anotarlas.
- Una cuenta ADMIN no puede eliminarse desde Configuración mientras conserve el rol (protege la trazabilidad).
- Los usuarios con rol ven un enlace "Administración" en el dashboard.

## Pantallas

| Ruta | Para qué |
| --- | --- |
| `/admin/plantillas` | Listado y alta de plantillas (nacen en borrador) |
| `/admin/plantillas/[id]` | Edición por formulario, vista previa, activar/publicar versión, duplicar, archivar y asignaciones |
| `/admin/auditoria` | Últimas 200 acciones administrativas |
| `GET/POST /api/admin/templates/[id]/preview` | PDF de muestra de la configuración guardada (GET) o de una sin guardar (POST). Solo ADMIN, con límite de 60/min |

## Editar una plantilla

El formulario cubre lo habitual sin tocar JSON:

- **Estilo**: color de acento, tipografía (moderna Inter, clásica Lora, técnica JetBrains Mono), título y subtítulo del encabezado, texto del pie, logo sí/no.
- **Secciones**: agregar, renombrar, ordenar y eliminar (los campos de una sección eliminada pasan a "sin sección").
- **Campos**: etiqueta, tipo (texto, texto largo, número, fecha, lista, casilla, importe), obligatorio, valor predeterminado, ayuda, sección, "mostrar en el PDF", opciones de listas (una por línea) y orden. El identificador técnico se genera de la etiqueta al crear el campo y **queda fijo** después, para no romper presupuestos ya guardados.
- **Validación antes de guardar**: usa el mismo esquema Zod que el servidor; el botón se bloquea y se listan los errores. El servidor vuelve a validar siempre.
- **Vista previa de esta configuración**: genera el PDF real con datos de ejemplo (sin guardar) y lo muestra en la página.
- **Modo avanzado (JSON)**: para casos específicos (por ejemplo mínimos y máximos de un campo). Al volver al formulario se reinterpreta el JSON.

## Ciclo de vida y versionado

1. **Borrador**: editable, nadie puede usarla aunque esté asignada.
2. **Activar**: crea la versión 1 (snapshot inmutable). Desde ahí las cuentas asignadas pueden usarla.
3. **Publicar nueva versión**: cada cambio posterior se publica como versión nueva. Los presupuestos guardados siguen renderizándose con la versión con la que se crearon; los nuevos usan la última.
4. **Archivar**: retira la plantilla para todos; no se puede editar ni asignar.

Asignar/revocar es por email de la cuenta; revocar pide un motivo (queda registrado) y corta el acceso al instante. Las plantillas privadas se conservan al cancelar Pro y no cambian el límite de descargas del plan.

## Auditoría

Cada acción (crear, editar, activar, archivar, duplicar, asignar, revocar) registra administrador, fecha, objeto y metadatos. Visible en `/admin/auditoria`.

## Operación segura

- No compartir la cuenta ADMIN; usar una cuenta personal con contraseña robusta.
- Revisar periódicamente `SELECT email FROM users WHERE role='ADMIN';`.
- Las plantillas de demostración (`e2e/fixtures/demo-templates.ts`) son solo para pruebas: no se publican como productos.
