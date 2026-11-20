# Guiones de video y ganchos

**Estado:** hay guiones y especificaciones, no videos terminados. Para producirlos con calidad comercial hace falta grabar la pantalla real del celular (se indica cómo) y editar con subtítulos; no se entregan videos generados automáticamente porque no alcanzarían la calidad necesaria.

## Cómo grabar el material real (15 minutos)

1. Abrir `https://presupuestos.atajolab.dev/crear` en un celular (Chrome o Safari) con el brillo al máximo.
2. Activar la grabación de pantalla del sistema.
3. Cargar los datos de ejemplo de la tabla (son ficticios y los mismos de las capturas de `marketing/capturas/`).
4. Grabar en vertical 1080×1920, 30 fps, sin notificaciones (modo «No molestar»).

| Campo            | Valor de ejemplo                            |
| ---------------- | ------------------------------------------- |
| Nombre comercial | Clima Hogar Servicio Técnico                |
| Cliente          | Lucía Fernández                             |
| Título           | Reparación de aire acondicionado            |
| Concepto 1       | Diagnóstico y visita técnica · 1 · 14500    |
| Concepto 2       | Carga de gas refrigerante R410A · 1 · 30400 |
| Concepto 3       | Mano de obra técnica · 2 · 16000            |

Cada guion usa esa grabación más los PDF reales de `marketing/ejemplos/imagenes/`. Subtitular siempre (la mayoría mira sin sonido). Los primeros 3 segundos deben mostrar el gancho en pantalla.

## Ganchos para los primeros 3 segundos

| Id         | Texto en pantalla                             | Imagen                                  |
| ---------- | --------------------------------------------- | --------------------------------------- |
| `gancho-1` | «Tu presupuesto profesional en minutos»       | PDF terminado llenando la pantalla      |
| `gancho-2` | «Armalo desde el celular. Sin registrarte.»   | Editor móvil con los campos llenándose  |
| `gancho-3` | «¿Todavía mandás los presupuestos por audio?» | Chat de WhatsApp simulado → PDF prolijo |
| `gancho-4` | «Cotizar una obra sin olvidarte nada»         | PDF de construcción desplazándose       |
| `gancho-5` | «Del diagnóstico al PDF en la misma visita»   | Técnico con celular + PDF               |
| `gancho-6` | «Así queda un presupuesto con tu logo»        | Subida de logo y vista previa           |

## Guion de 10 segundos (solo el esencial)

| Tiempo | Imagen                                                                      | Texto en pantalla / voz                  |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------- |
| 0–3 s  | PDF terminado (gancho-1)                                                    | «Tu presupuesto profesional en minutos»  |
| 3–7 s  | Grabación acelerada del editor: se cargan 3 conceptos y el total se calcula | «Cargás los conceptos y se calcula solo» |
| 7–10 s | Botón «Crear mi presupuesto gratis» + URL                                   | «Probalo gratis, sin registrarte»        |

## Guion de 15 segundos

| Tiempo  | Imagen                                              | Texto en pantalla / voz                                   |
| ------- | --------------------------------------------------- | --------------------------------------------------------- |
| 0–3 s   | Gancho a elección (`gancho-2` para tráfico frío)    | Texto del gancho                                          |
| 3–8 s   | Editor: nombre del negocio, logo, 3 conceptos       | «Poné tu logo y tus conceptos»                            |
| 8–12 s  | Vista previa del presupuesto → toque en «Descargar» | «Descargalo en PDF y mandalo por WhatsApp»                |
| 12–15 s | Pantalla final con el botón y la URL                | «Crear mi presupuesto gratis · presupuestos.atajolab.dev» |

## Guion de 30 segundos

| Tiempo  | Imagen                                                   | Texto en pantalla / voz                                       |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| 0–3 s   | Gancho (`gancho-3`): audio/mensaje suelto → PDF          | «¿Todavía mandás los presupuestos por audio?»                 |
| 3–8 s   | Problema: mensaje desordenado con precios sueltos        | «Un mensaje suelto no inspira confianza»                      |
| 8–15 s  | Editor: se llenan datos del negocio y se sube el logo    | «Con AtajoLab Presupuestos armás uno prolijo con tu logo»     |
| 15–22 s | Conceptos con cantidades y precios; el total se calcula  | «Cantidades, precios y total, sin errores de cálculo»         |
| 22–27 s | Vista previa → descarga del PDF → compartir por WhatsApp | «Descargalo en PDF y mandalo en un toque»                     |
| 27–30 s | Pantalla final                                           | «Probalo gratis, sin registrarte · presupuestos.atajolab.dev» |

## Variantes por rubro (cambiar solo el ejemplo)

- **Talleres:** PDF `rubro-talleres`; gancho-3 o gancho-4 adaptado («Repuestos y mano de obra, claros»).
- **Obras:** PDF `rubro-construccion`; gancho-4.
- **Técnicos:** PDF `rubro-tecnicos`; gancho-5.

## No hacer

- No mostrar precios, Pack ni plantillas premium mientras las ventas estén cerradas.
- No mostrar datos de clientes reales: usar siempre los ficticios.
- No prometer cifras («ahorrá X horas») que no se hayan medido.
