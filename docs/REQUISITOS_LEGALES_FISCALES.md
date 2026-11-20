# Requisitos legales y fiscales pendientes

Lista de verificación para quien explota el servicio (titular: Axel Alejandro Morel, nombre comercial AtajoLab). **No es asesoramiento legal ni contable**: cada punto debe confirmarse con un contador o abogado. Mientras haya puntos abiertos, los textos de `/legal/*` se mantienen como borrador y las ventas públicas siguen cerradas (`SALES_ENABLED` sin activar).

## Confirmado y cargado en los textos

| Dato | Valor |
| --- | --- |
| Titular | Axel Alejandro Morel (nombre comercial AtajoLab) |
| Correo de soporte | `atajolab.tools@gmail.com` (el que publica el sitio institucional atajolab.dev) |
| Jurisdicción | Tribunales ordinarios de Formosa, sin perjuicio de la opción del consumidor (Ley 24.240, art. 36) |
| Cobros | Cuenta personal de Mercado Pago (persona física); precios finales en ARS |
| Cambios de precio | Aviso con 30 días corridos |
| Pack Premium | Permanente, sin renovación ni vencimiento programado, mientras el servicio esté disponible (aviso de 30 días si se discontinúa) |
| Reembolsos | Revocación a 10 días corridos; sin reembolso de períodos iniciados salvo error de cobro, cobro duplicado o falla grave imputable; cancelación de la renovación en cualquier momento |
| Responsabilidad | Cláusula razonable que no excluye responsabilidades legales ni derechos del consumidor |
| Conservación de registros financieros | 10 años, sujeto a validación |
| Backups | Locales, retención de 14 días |

## Pendiente (no se declara hasta verificarlo)

### Fiscal

1. **Inscripción ante ARCA** (CUIT y condición, p. ej. Monotributo u otro régimen). Hoy el titular no tiene inscripción tributaria: no se afirma ningún CUIT ni condición. Definir con el contador **antes** de cobrar de forma habitual.
2. **Tratamiento de IVA en los precios** (depende del punto 1). Campo `priceTaxNote`.
3. **Facturación de cada venta**: el servicio no integra ARCA. Una vez inscripto, el comprobante de cada pago debe emitirse por fuera (los PDF de la app son presupuestos sin validez fiscal).
4. **Ingresos Brutos (Rentas de Formosa) y habilitaciones** municipales o provinciales, según corresponda.
5. **Mercado Pago**: el token pertenece a una cuenta personal (persona física). Confirmar con Mercado Pago si exige validación de identidad/CUIT o límites para cobrar de forma comercial y retirar fondos.

### Legal

6. **Domicilio legal** (el particular del titular): falta cargarlo en `legal-data.ts` (campo `address`). Es dato personal: se publica en los textos; confirmar que se desea exponerlo.
7. **CUIT y condición frente a ARCA** en el sitio (datos del proveedor exigidos al vender a consumidores): campos `taxId` y `taxStatus`.
8. **AAIP**: verificar si corresponde inscribir la base de datos de usuarios (Ley 25.326). El texto **no** declara inscripción ni exención (campo `dataRegistration`).
9. **Botón de arrepentimiento y baja online** (resoluciones de la Secretaría de Comercio Interior sobre contratación a distancia): verificar si aplican. Hoy la revocación se gestiona por correo y la cancelación de Pro se hace desde *Mi plan*.
10. **Enlace a Defensa del Consumidor** en el sitio: verificar la obligación y la dirección de Formosa/Nación.
11. **Revisión final** de todos los textos por abogado y contador.

## Cómo se completan

1. Cargar los datos en `src/content/legal-data.ts` (cada marcador `[COMPLETAR]` se reemplaza solo).
2. Cuando no queda ninguno, las páginas se muestran como finales, se indexan y entran al sitemap.
3. Recién entonces, y con la compra controlada validada, abrir ventas (`docs/LANZAMIENTO.md`).
