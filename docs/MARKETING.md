# Marketing y campañas — AtajoLab Presupuestos

Guía operativa para lanzar tráfico pago (Instagram, Facebook, TikTok). Material en [`marketing/`](../marketing/README.md). Estado de las ventas, pagos y requisitos legales: [`LANZAMIENTO.md`](./LANZAMIENTO.md) y [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).

> **Las ventas siguen cerradas** (`SALES_ENABLED` sin activar). Los anuncios ofrecen solo lo gratuito: armar el presupuesto sin registrarte, personalizar con logo, descargar PDF (3 por mes con cuenta gratuita) y compartir. No se promociona el Pack, ni los diseños premium, ni las plantillas a medida, ni se muestran precios en los anuncios. La landing muestra los planes pagos como «Próximamente».

## 1. Qué ve alguien que llega desde un anuncio

Primera pantalla (móvil): «Creá presupuestos profesionales en minutos.» → «Personalizalos con tu logo, descargalos en PDF y compartilos con tus clientes.» → botón **Crear mi presupuesto gratis** (lleva directo al editor, sin registro) y **Ver ejemplos** (PDF reales con datos ficticios). Debajo: un presupuesto real generado por la aplicación.

Recorrido hasta el valor:

| Paso | Qué hace la persona                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| 1    | Toca el anuncio → landing o página por rubro                                                               |
| 2    | Toca «Crear mi presupuesto gratis» → abre el editor (1 toque, sin registro)                                |
| 3    | Completa los datos y conceptos; ve el total y la vista previa al instante                                  |
| 4    | Para **descargar el PDF** crea una cuenta gratuita (email y contraseña) y vuelve al editor con su borrador |
| 5    | Descarga el PDF (3 por mes gratis)                                                                         |

## 2. URLs de campaña definitivas

Destinos (todos verificados, devuelven 200 sin redirecciones):

| Destino      | Ruta                 | Para quién                                                         |
| ------------ | -------------------- | ------------------------------------------------------------------ |
| Landing      | `/`                  | Público general, independientes, emprendedores, pequeños comercios |
| Talleres     | `/para/talleres`     | Talleres mecánicos                                                 |
| Construcción | `/para/construccion` | Obras, albañilería, refacciones                                    |
| Técnicos     | `/para/tecnicos`     | Técnicos, instaladores, servicios                                  |
| Editor       | `/crear`             | Retargeting y campañas de «probalo ya»                             |

Independientes, emprendedores y pequeños comercios van a la landing: no se crearon páginas separadas porque el contenido sería el mismo (solo las tres páginas por rubro tienen contenido y ejemplo propios).

Parámetros UTM:

| Canal                  | `utm_source` | `utm_medium`     |
| ---------------------- | ------------ | ---------------- |
| Instagram Ads          | `instagram`  | `paid_social`    |
| Facebook Ads           | `facebook`   | `paid_social`    |
| TikTok Ads             | `tiktok`     | `paid_social`    |
| Instagram orgánico     | `instagram`  | `organic_social` |
| TikTok orgánico        | `tiktok`     | `organic_social` |
| WhatsApp               | `whatsapp`   | `message`        |
| AtajoLab institucional | `atajolab`   | `referral`       |

`utm_campaign=lanzamiento_01` para la primera tanda; usar `utm_content` para distinguir la creatividad (por ejemplo `utm_content=minutos_v1`).

**Enlaces listos para copiar** (campaña `lanzamiento_01`; la lista completa de 35 combinaciones está en [`marketing/textos/enlaces-utm.md`](../marketing/textos/enlaces-utm.md)):

```text
Instagram Ads  → https://presupuestos.atajolab.dev/?utm_source=instagram&utm_medium=paid_social&utm_campaign=lanzamiento_01
Facebook Ads   → https://presupuestos.atajolab.dev/?utm_source=facebook&utm_medium=paid_social&utm_campaign=lanzamiento_01
TikTok Ads     → https://presupuestos.atajolab.dev/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=lanzamiento_01
Instagram bio  → https://presupuestos.atajolab.dev/?utm_source=instagram&utm_medium=organic_social&utm_campaign=lanzamiento_01
TikTok bio     → https://presupuestos.atajolab.dev/?utm_source=tiktok&utm_medium=organic_social&utm_campaign=lanzamiento_01
WhatsApp       → https://presupuestos.atajolab.dev/?utm_source=whatsapp&utm_medium=message&utm_campaign=lanzamiento_01
AtajoLab       → https://presupuestos.atajolab.dev/?utm_source=atajolab&utm_medium=referral&utm_campaign=lanzamiento_01
```

Para talleres, obras y técnicos, reemplazar `/` por `/para/talleres`, `/para/construccion` o `/para/tecnicos`.

### Cómo persiste la atribución

- Los UTM se guardan en la pestaña (`sessionStorage`) al llegar, aunque la persona navegue a `/crear`, al registro y vuelva. No se guardan en cookies ni se envían a nuestro servidor.
- Solo si la persona acepta el aviso de cookies **y** hay herramientas de medición configuradas, se conservan 30 días en el navegador (para atribuir un registro posterior).
- Cada evento lleva los UTM, así que Meta, TikTok y GA4 pueden atribuir los eventos (por ejemplo `sign_up`) a la campaña.
- No se guarda la atribución en la base de datos ni se asocia a la cuenta.

## 3. Eventos de conversión

| Evento propio       | Cuándo se dispara                                                       | Meta Pixel                                           | TikTok Pixel           | GA4                 |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------- | ------------------- |
| `landing_view`      | Visita a la landing o a una página por rubro                            | `ViewContent`                                        | `ViewContent`          | `landing_view`      |
| `cta_start`         | Clic en «Crear mi presupuesto gratis»                                   | `StartFree` (personalizado)                          | `ClickButton`          | `cta_start`         |
| `editor_start`      | Se abre el editor                                                       | `EditorStart` (personalizado)                        | `ViewContent` (editor) | `editor_start`      |
| `sign_up`           | Registro completado (cookie efímera tras crear la cuenta)               | `CompleteRegistration`                               | `CompleteRegistration` | `sign_up`           |
| `quote_first_valid` | Primera vez que el presupuesto está completo y válido en el dispositivo | `QuoteCreated` (personalizado)                       | `SubmitForm`           | `quote_first_valid` |
| `pdf_download`      | PDF descargado (`first=true` la primera vez)                            | primera: `Lead`; luego `PdfDownload` (personalizado) | `Download`             | `pdf_download`      |
| `plans_view`        | Ver la página de plan                                                   | `ViewContent`                                        | `ViewContent`          | `plans_view`        |
| `checkout_start`    | Clic en comprar (solo con ventas abiertas o cuenta habilitada)          | `InitiateCheckout`                                   | `InitiateCheckout`     | `begin_checkout`    |
| `purchase`          | **Solo** con el pago APROBADO en el servidor, una vez por pago          | `Purchase`                                           | `CompletePayment`      | `purchase`          |

La definición exacta del mapeo está en `src/lib/analytics/events.ts` (con pruebas). `purchase` no se dispara al visitar la página de resultado, sino únicamente cuando el servidor confirma el pago, y se evita duplicarlo recargando la página.

**Qué se envía y qué no:** solo el nombre del evento, la ruta de la página, los UTM, el nombre de plan y el monto/moneda del cobro. Nunca emails, nombres, contenido de presupuestos, datos de clientes ni importes de los presupuestos. Hay una lista blanca de parámetros y se descartan valores con `@` o demasiado largos.

## 4. Privacidad y consentimiento

- Sin identificadores configurados: **no se carga ningún script de terceros**, no aparece aviso de cookies y los eventos no salen del sitio.
- Con identificadores: aparece un aviso (Aceptar / Rechazar). Hasta aceptar no se carga nada. Si el navegador envía Global Privacy Control, se trata como rechazo. El pie ofrece «Preferencias de cookies» para cambiar la elección.
- La política de privacidad (`/legal/privacidad`, sección Cookies) describe esta medición.
- La política de seguridad de contenido (CSP) permite solo los dominios de los tres proveedores.

## 5. Configuración pendiente de Meta, TikTok y GA4

Las tres variables se leen **en tiempo de ejecución** (no hace falta reconstruir la imagen). Cargarlas en el VPS con el script de entrada oculta (se pueden cargar solo las que se usen):

```bash
cd /opt/atajolab/apps/presupuestos   # carpeta de despliegue en el VPS
./scripts/set-secret.sh --recreate META_PIXEL_ID TIKTOK_PIXEL_ID GA4_MEASUREMENT_ID
```

| Plataforma | Qué crear                                                        | Formato esperado                       |
| ---------- | ---------------------------------------------------------------- | -------------------------------------- |
| Meta       | Pixel en Events Manager (cuenta publicitaria + Business Manager) | 8–20 dígitos                           |
| TikTok     | Pixel en TikTok Ads Manager → Assets → Events                    | 10–30 caracteres, mayúsculas y números |
| GA4        | Propiedad y flujo web en Google Analytics                        | `G-XXXXXXXXXX`                         |

Pasos en cada plataforma:

1. **Meta:** crear el Pixel, cargar el ID, verificar el dominio `atajolab.dev` en Business Manager, abrir Test Events y probar. En «Eventos agregados» (Aggregated Event Measurement), optimizar por `CompleteRegistration` (registro); la primera descarga de PDF se envía como `Lead` y sirve como evento de activación.
2. **TikTok:** crear el Pixel, cargar el ID, verificar con TikTok Pixel Helper. Optimizar por `CompleteRegistration`.
3. **GA4:** crear la propiedad, marcar como conversiones `sign_up`, `pdf_download` y `purchase`.
4. Los píxeles no se activan por sí solos: si el ID no está cargado, esa plataforma queda desactivada.

## 6. Cómo validar la medición

Con IDs ya cargados, abrir el sitio, aceptar las cookies y usar las herramientas de cada plataforma (Meta Pixel Helper, TikTok Pixel Helper, GA4 DebugView, y Test Events de Meta/TikTok).

Validación sin plataformas (modo depuración local): en la consola del navegador ejecutar `localStorage.setItem("ph_debug","1")`, recargar y revisar `window.__phEvents` (eventos de la página actual) o `sessionStorage.ph_debug_log` (la sesión completa). Cada entrada muestra el evento, los parámetros y si se envió (`sent`). Probar el recorrido: landing con UTM → «Crear mi presupuesto gratis» → editor → registro → PDF. Los UTM deben aparecer en todos los eventos.

Pruebas automáticas del repositorio: `e2e/marketing.spec.ts` (enlaces con UTM, páginas por rubro, metadatos, consentimiento, ausencia de terceros, persistencia de UTM hasta el registro) y `src/lib/analytics/events.test.ts`.

## 7. Compartir enlaces (vista previa)

Cada página tiene título, descripción, canonical, Open Graph y Twitter Card con imagen absoluta 1200×630 (`/og/presupuestos.png`, `/og/para-talleres.png`, `/og/para-construccion.png`, `/og/para-tecnicos.png`). Las páginas son públicas, sin autenticación ni redirecciones, y responden 200 con los agentes de Instagram, TikTok, Facebook y WhatsApp (probado en `e2e/marketing.spec.ts`).

Para refrescar una vista previa que quedó en caché: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (sirve también para Instagram y WhatsApp). Verificación manual recomendada: pegar cada enlace en un chat de WhatsApp antes de gastar.

## 8. Inventario de creatividades

Ver [`marketing/README.md`](../marketing/README.md). Resumen: 5 conceptos (`minutos`, `sin-registro`, `taller`, `obra`, `tecnicos`) en 4 formatos (1080×1920, 1080×1350, 1080×1080, 1200×630), PDF y capturas reales, textos de anuncios para Meta y TikTok, 6 ganchos de 3 s y guiones de 10/15/30 s. **No hay videos terminados**, solo guiones y la guía para grabarlos.

## 9. Públicos y propuestas de campaña iniciales

Los públicos son hipótesis para validar, no datos medidos. Presupuesto y segmentación finos los define quien opera las cuentas.

| Campaña     | Público (Argentina)                                       | Creatividad               | Destino              | Objetivo                           |
| ----------- | --------------------------------------------------------- | ------------------------- | -------------------- | ---------------------------------- |
| A. General  | 25–55 años, emprendedores, oficios y servicios            | `minutos`, `sin-registro` | `/`                  | Registros (`CompleteRegistration`) |
| B. Talleres | Intereses de mecánica automotriz, dueños de talleres      | `taller`                  | `/para/talleres`     | Registros                          |
| C. Obras    | Albañilería, construcción, refacciones                    | `obra`                    | `/para/construccion` | Registros                          |
| D. Técnicos | Aire acondicionado, electricidad, plomería, instalaciones | `tecnicos`                | `/para/tecnicos`     | Registros                          |

Sugerencia: empezar con un presupuesto diario bajo, 2 creatividades por conjunto, 5–7 días sin tocar nada, y decidir con costo por registro y porcentaje de registros que descargan un PDF (`pdf_download`). Comparar luego los rubros. Con pocas conversiones, optimizar por clics en la landing (tráfico) y migrar a registro cuando haya volumen.

## 10. Rendimiento (auditoría previa al gasto)

Medido con Lighthouse móvil sobre la compilación de producción y verificado con Playwright (Pixel 7 / iPhone 13, 360–412 px):

- Sin desborde horizontal en la landing ni en las páginas por rubro (prueba automática).
- Imágenes de la landing: WebP, con ancho y alto declarados (sin saltos de diseño); imagen principal con prioridad alta. Peso total de `public/ejemplos`: ~0,5 MB.
- Botones principales de 48 px de alto (mínimo táctil 44 px, verificado por prueba).
- Texto con contraste AA (color de marca más oscuro para texto).
- Sin scripts de terceros hasta que haya IDs y consentimiento.

Los números finales están en el informe de entrega del lanzamiento de marketing.

## 11. Checklist antes de gastar en anuncios

- [ ] Prueba real: abrir cada enlace de `enlaces-utm.md` desde un celular, ver que carga rápido y que el CTA lleva al editor.
- [ ] Pegar la landing y una página por rubro en un chat de WhatsApp y verificar título e imagen.
- [ ] Crear y cargar los IDs de Meta, TikTok y GA4 (sección 5) y validar eventos (sección 6).
- [ ] Hacer una cuenta de prueba: registro → editor → descarga de PDF, y ver `sign_up` y `pdf_download` en cada plataforma.
- [ ] Confirmar que las ventas siguen cerradas y que los anuncios no mencionan precios, Pack ni plantillas premium.
- [ ] Revisar cada creatividad (texto, datos ficticios, leyenda de ejemplo).
- [ ] Definir presupuesto diario máximo y criterio de corte.
- [ ] Revisar `/legal/privacidad` y los datos de contacto visibles.
- [ ] Si se quiere vender: completar antes los pendientes legales/fiscales y la validación de pago real de `LANZAMIENTO.md`, abrir las ventas (`SALES_ENABLED=true`) y recién ahí sumar el Pack a los anuncios.
