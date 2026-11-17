# Auditoría de seguridad

Última revisión: 2026-11-17. Alcance: código de la aplicación y pruebas locales/E2E. **No sustituye** una auditoría externa ni pruebas de penetración sobre el VPS.

## Resumen

| Área | Resultado | Evidencia |
| --- | --- | --- |
| Aislamiento entre usuarios | OK | Servicios filtran por `userId`; `getQuote`/`update`/`delete` ajenos → `NotFoundError` (`persistence.test.ts`) |
| Autorización servidor | OK | `requireApiUser` / `requireUser`; PDF final exige sesión; premium → `template_locked` (`premium-access.spec.ts`) |
| Descargas / límites | OK | Reserva atómica + burst Pro en base; rate limit PDF en memoria por usuario |
| Permisos premium | OK | Decisión en servidor (`decidePdfRender`); preview con marca de agua sin consumir cupo |
| Autenticación | OK | Credentials + argon2id; timing dummy; rate limit por IP y por cuenta; `sessionVersion` invalida JWT |
| Recuperación de contraseña | OK | Token opaco, hash en base, invalidación al usar; sin filtrar existencia de email |
| Webhooks MP | OK | Firma HMAC (SDK oficial, 5 min); cuerpo no es fuente de verdad; idempotencia; body ≤ 100 KB |
| Subida de imágenes (logo) | OK | Solo `data:image/(png\|jpeg);base64,…`, máx. 400 KB; CSP `img-src 'self' data: blob:` |
| Rate limiting | OK para 1 réplica | En memoria (login, registro, PDF). Límites de descarga Pro en PostgreSQL |
| Cookies / sesión | OK | JWT Auth.js, `AUTH_TRUST_HOST`, HSTS en producción |
| CSP / encabezados | OK con salvedad | `frame-ancestors 'none'`, `object-src 'none'`, nosniff, COOP. CSP usa `'unsafe-inline'` (Next.js) |
| Secretos | OK en diseño | `.env` 600 en deploy; plantilla sin valores; no se versionan secretos |
| Dependencias | OK tras fix | `pnpm audit --prod --audit-level high` limpio; `shadcn` movido a `devDependencies` |

## Hallazgos aceptados (no bloqueantes)

1. **CSP con `unsafe-inline`**: requerido por Next.js sin nonces por solicitud. Mitigado con el resto de la política estricta.
2. **Rate limit en memoria**: válido con una sola réplica (la prevista). No hace falta Redis.
3. **Preview PDF anónimo**: intencional para el embudo comercial; el PDF final siempre exige cuenta y permisos.

## No cubierto en esta pasada

- Fuzzing / pentest del VPS desplegado.
- Validación real de webhooks y OAuth contra Mercado Pago sandbox.
- Revisión legal de textos `/legal/*` (siguen con placeholders).
