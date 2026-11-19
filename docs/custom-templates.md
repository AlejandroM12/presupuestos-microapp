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
    "accentColor": "#0e7490",
    "fontFamily": "sans | serif | mono",
    "headerTitle": "Orden de trabajo",
    "headerSubtitle": "Mecánica ligera y frenos",
    "footerText": "Garantía de 90 días sobre mano de obra.",
    "showLogo": true,
    "headerVariant": "classic | banner | boxed",
    "tableStyle": "tinted | lines | zebra | grid",
    "totalsStyle": "bar | box | plain",
    "sectionColumns": 1,
    "showTerms": true,
    "approval": false,
    "approvalText": "Autorización del cliente"
  },
  "sections": [{ "id": "vehiculo", "title": "Datos del vehículo", "position": 0, "columns": 2 }],
  "fields": [
    { "id": "patente", "label": "Patente", "type": "text", "required": true, "highlight": true, "sectionId": "vehiculo" },
    { "id": "km", "label": "Kilometraje", "type": "number", "min": 0, "unit": "km", "highlight": true },
    { "id": "anticipo", "label": "Anticipo", "type": "money", "role": "advance" },
    { "id": "interno", "label": "Nota interna", "type": "text", "showInPdf": false }
  ]
}
```

Tipos de campo: `text`, `textarea`, `number`, `date`, `select` (con `options`), `checkbox`, `money`. Los `id` son `[a-z][a-z0-9_]*`. Límites: 80 campos, 30 secciones. Los campos vacíos no se imprimen; los `showInPdf: false` quedan solo en el presupuesto guardado.

### Estructura (todas las opciones son opcionales)

Un solo renderizador genérico (`templates/custom.tsx`) compone el documento a partir de estas opciones; **no hay renderizadores por cliente** ni se acepta HTML/código. Si una opción falta se usa el valor por defecto, que reproduce el diseño original (compatibilidad con plantillas y versiones históricas: la prueba de `pagination.test.ts` lo verifica).

| Opción | Valores | Efecto |
| --- | --- | --- |
| `style.headerVariant` | `classic` (por defecto), `banner`, `boxed` | Encabezado: logo y datos a la izquierda; banda de color a todo el ancho (el logo va en una caja blanca); o ficha del documento a la derecha |
| `style.tableStyle` | `tinted` (por defecto), `lines`, `zebra`, `grid` | Tabla: encabezado con fondo suave; solo líneas; encabezado de color con filas alternadas; cuadrícula |
| `style.totalsStyle` | `bar` (por defecto), `box`, `plain` | Totales: barra de color, recuadro o línea simple |
| `style.sectionColumns` / `sections[].columns` | `1` (por defecto) o `2` | Distribución de los campos de las secciones (los textos largos ocupan todo el ancho) |
| `style.showTerms` | `true` (por defecto) | Muestra observaciones y condiciones comerciales |
| `style.approval`, `approvalText` | `false` (por defecto) | Bloque de aprobación con firma, aclaración y fecha |
| `fields[].highlight` | `false` | Ficha destacada bajo el título (máximo 4 por documento) |
| `fields[].unit` | texto corto | Sufijo ("km", "m²") junto al valor; los números desde 10.000 se imprimen con separador de miles |
| `fields[].role` | `advance` | Un campo de importe (solo uno) que se muestra como **Anticipo** y calcula el **Saldo pendiente** = total − anticipo, con decimales exactos |

## Procedimiento: crear y asignar una plantilla

1. **Otorgar rol de administrador** (una sola vez, a una cuenta existente). No hay administrador por defecto ni forma de autoasignarse el rol desde la aplicación:
   `docker exec presupuestos-db psql -U presupuestos -d presupuestos -c "UPDATE users SET role='ADMIN' WHERE email='tu@email';"`
   (o `node scripts/grant-admin.mjs <email>` con `DATABASE_URL` en un entorno con el repositorio). Quitar el rol: mismo `UPDATE` con `'USER'`; surte efecto en la siguiente solicitud porque el rol se consulta en la base cada vez.
2. Entrar a **/admin/plantillas** → "Nueva plantilla" (queda en borrador).
3. Configurar con el **formulario** (estilo, secciones, campos con tipo, obligatorio, valor predeterminado, opciones y orden) → "Guardar cambios". El **modo avanzado (JSON)** sigue disponible. Ver `docs/admin.md`.
4. **Vista previa**: "Vista previa de esta configuración" muestra en la propia página el PDF real con datos de ejemplo, sin guardar (también en borrador). Iterar hasta aprobar el diseño con el cliente.
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

## Vista previa fiel en el editor

Al elegir una plantilla privada, el editor deja de mostrar la maqueta HTML y muestra **el mismo PDF que se descargará**:

- Se pide al servidor con `POST /api/quotes/pdf?preview=1` (mismo renderizador, tipografías, colores, secciones y campos; con marca de agua "VISTA PREVIA") y se dibuja página por página con pdf.js (`src/components/quote/pdf-preview.tsx`, `src/lib/pdf-raster.ts`). pdf.js se carga recién al usar esta vista.
- **Debounce de 900 ms** y cancelación de la solicitud anterior (`AbortController`): no se regenera con cada tecla. Si el formulario no es válido, no se pide nada.
- Funciona igual en mobile (pestaña "Vista previa"), con documentos de varias páginas.
- **No consume cupo**: las vistas previas no cuentan como descargas y llevan marca de agua, por lo que no sirven como documento final. Tienen su **propio límite** (`RATE_LIMIT_PREVIEW_PER_MINUTE`, 40/min por IP en el editor y por usuario en presupuestos guardados), separado del de descargas.
- La autorización es la de siempre: sin asignación vigente, la vista previa responde 403 igual que el PDF final.

Alternativas evaluadas: un `<iframe>`/`<object>` con el PDF (no muestra todas las páginas en iOS/Android), y replicar el diseño en HTML (duplica la lógica y deja de ser fiel). Rasterizar el PDF real reutiliza el renderizador existente y es lo más mantenible.

## Paginación de los PDF (todas las plantillas)

- **Un encabezado de tabla por página**, sin grupos artificiales de filas: las filas son indivisibles y se llenan según la altura real. El encabezado de la primera página va en línea; en las siguientes se repite arriba una única vez (`PaginatedTable`, `src/services/pdf/pagination.tsx`).
- **Sin páginas huérfanas**: la última fila viaja con los totales y las condiciones, de modo que ninguna página queda con un encabezado sin filas ni solo con totales. Si el cierre es muy extenso (más de ~3.200 caracteres de observaciones y condiciones) fluye libremente para no recortar texto.
- **Encabezado compacto de continuación** desde la página 2: negocio, "Presupuesto N.º …", fecha y cliente; la numeración "Página X de Y" se mantiene.
- Nota técnica: react-pdf no dibuja el texto de elementos `render` que heredan el interlineado de la página; por eso el contenedor fija el suyo (ver comentario en `pagination.tsx`).
- Prueba `pagination.test.ts`: 1, 5, 10, 35 y 100 conceptos en las seis plantillas del catálogo y las tres demostraciones (un encabezado por página con filas, ninguno en páginas sin filas, totales una sola vez en la última, todos los conceptos en orden, numeración y aviso legal en todas).

## Plantillas de demostración y PDFs de muestra

Tres plantillas ficticias con identidad, logo y datos inventados (taller mecánico: encabezado en ficha, cuadrícula, recuadro de totales y autorización; construcción: banda de color, líneas, anticipo y saldo, conformidad del propietario; servicios técnicos: clásico, filas alternadas y barra de totales). Definición en `src/services/pdf/demo-data.ts`; Playwright las usa en `e2e/demo-templates.spec.ts` (alta en administración, configuración, vista previa, activación, asignación, cliente, descarga y límite gratuito).

Los PDF se guardan **localmente** (no se versionan) en `examples/demo-pdfs/`:

| Archivo | Contenido |
| --- | --- |
| `taller-mecanico.pdf`, `construccion.pdf`, `servicios-tecnicos.pdf` | Muestras comerciales (datos, conceptos y precios coherentes) |
| `*-multipagina.pdf` | La misma identidad con 35 conceptos |
| `casos-extremos/` | 1, 5, 10 y 100 conceptos; nombres y textos largos; campos personalizados extensos; opcionales vacíos; sin condiciones comerciales; USD con descuento, recargo e impuestos; logos de distintas proporciones; las seis plantillas del catálogo con 35 conceptos |

Regenerar: `PDF_SAMPLES_DIR=examples/demo-pdfs pnpm exec vitest run src/services/pdf/pagination.test.ts -t volcado` (y `node scripts/pdf-to-png.mjs <carpeta>` + `node scripts/contact-sheet.mjs` para revisarlos como imágenes). Estas plantillas **no** son productos comerciales ni se crean en producción.

## Pendiente

- No hay editor visual tipo lienzo: el formulario cubre estilo, secciones y campos; el diseño del documento es el del renderizador genérico.
- El logo del negocio sigue siendo el del perfil; no hay assets propios por plantilla.
