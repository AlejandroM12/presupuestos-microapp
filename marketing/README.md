# Material de marketing — AtajoLab Presupuestos

Todo el material se genera a partir del producto real: los PDF salen del mismo motor que usa la aplicación y las capturas son de la aplicación en producción. **Los datos de los documentos (negocios, clientes, importes) son ficticios.** No hay testimonios, cifras de usuarios ni calificaciones inventadas.

Estrategia, URLs definitivas, eventos y checklist: [`docs/MARKETING.md`](../docs/MARKETING.md).

## Contenido

| Carpeta                             | Qué hay                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `capturas/`                         | Capturas reales de la landing y del editor (móvil y escritorio) con datos ficticios                                   |
| `ejemplos/pdf/`                     | PDF de ejemplo: un presupuesto por rubro (talleres, construcción, técnicos) y los seis diseños con el mismo contenido |
| `ejemplos/imagenes/`                | Los mismos PDF como imágenes WebP de alta resolución (para creatividades y videos)                                    |
| `creatividades/vertical-1080x1920/` | Stories, Reels y TikTok (9:16)                                                                                        |
| `creatividades/vertical-1080x1350/` | Feed vertical de Instagram y Facebook (4:5)                                                                           |
| `creatividades/cuadrado-1080x1080/` | Feed cuadrado (1:1)                                                                                                   |
| `creatividades/social-1200x630/`    | Imagen horizontal para anuncios de enlace y vista previa al compartir                                                 |
| `textos/`                           | Textos de anuncios (Meta y TikTok), CTA, y enlaces de destino con UTM                                                 |
| `video/`                            | Guiones de 10, 15 y 30 segundos y ganchos de 3 segundos (ver estado abajo)                                            |
| `build/`                            | Scripts para regenerar todo                                                                                           |

### Creatividades disponibles (5 conceptos × 4 formatos = 20 archivos)

| Archivo            | Mensaje                                      | Destino sugerido     |
| ------------------ | -------------------------------------------- | -------------------- |
| `minutos.png`      | Tu presupuesto profesional, listo en minutos | Landing              |
| `sin-registro.png` | Armá tu presupuesto sin registrarte          | Editor               |
| `taller.png`       | Repuestos, mano de obra y total claro        | `/para/talleres`     |
| `obra.png`         | Cotizá tu obra sin olvidarte nada            | `/para/construccion` |
| `tecnicos.png`     | De la visita al presupuesto, en el momento   | `/para/tecnicos`     |

Las creatividades respetan las zonas seguras de Stories/Reels/TikTok (sin texto clave en la parte superior ni en la inferior, donde las plataformas superponen su interfaz). Las imágenes con PDF llevan la leyenda «Ejemplo con datos ficticios».

### Video

No hay videos terminados. Hay guiones, ganchos y la guía para grabar la pantalla real en `video/guiones.md`. Se prefirió no entregar videos generados automáticamente porque no tendrían calidad comercial.

## Regenerar

```bash
# 1. PDF reales de muestra (generador de desarrollo, usa el mismo motor que la app)
PDF_MARKETING_DIR=tmp/pdf pnpm vitest run src/services/pdf/marketing-samples.test.ts
# 2. Imágenes de los PDF (WebP; requiere Chromium de Playwright)
node scripts/pdf-to-images.mjs tmp/pdf marketing/ejemplos/imagenes --scale 2.2 --format webp
# 3. Capturas del editor y la landing (por defecto contra producción)
node marketing/build/capture-screens.mjs [URL_BASE]
# 4. Creatividades e imágenes sociales (también actualiza public/og/)
node marketing/build/build-creatives.mjs
# 5. Enlaces con UTM (editar canales/destinos en utm-links.mjs)
node marketing/build/gen-utm-doc.mjs
```

Los textos y la composición de las creatividades están en `build/build-creatives.mjs` (constante `CONCEPTS`).

## Reglas

- Mientras las ventas estén cerradas, **no** promocionar el Pack, diseños premium, plantillas a medida ni precios.
- Mostrar siempre datos ficticios y aclararlo cuando se muestra un PDF.
- No agregar números de usuarios, testimonios ni calificaciones que no existan.
