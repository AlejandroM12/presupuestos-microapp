# Backups y restauración

Scripts en `deploy/scripts/` (verificados en local: backup de una base con datos y restauración en una base vacía con las 16 tablas).

## Backup

```bash
./scripts/backup.sh
```

- Usa `pg_dump -Fc` (comprimido) dentro de un contenedor `postgres:17-alpine`; no requiere cliente de PostgreSQL en el host.
- **Verifica** cada dump con `pg_restore --list` (debe contener las tablas esperadas); si falla, alerta y sale con error.
- Guarda en `BACKUP_DIR` (por defecto `./backups`, permisos 700/600) y borra los de más de `BACKUP_RETENTION_DAYS` (14).
- **Copia externa**: con `OFFSITE_RCLONE_REMOTE` y `RCLONE_CONFIG_FILE` sube el dump con rclone (cualquier destino compatible: Hetzner Storage Box/Object Storage, S3, B2, etc.). Sin eso emite una advertencia: un backup solo en el VPS no alcanza.
- **Alertas**: ante cualquier fallo envía un mensaje a `ALERT_WEBHOOK_URL` (ver `docs/monitoring.md`).
- Registra `.last_success` para que `monitor.sh` detecte backups atrasados.
- Si la base está en una red Docker, definir `PG_DOCKER_NETWORK`.
- `deploy.sh` ejecuta un backup antes de cada despliegue y aborta si falla.

Validado en local: backup con verificación (32 objetos TABLE), fallo con alerta ante base inaccesible, y subida con rclone a un destino de tipo `local`. **No validado** contra un destino remoto real ni en el VPS: falta definir el almacenamiento externo (ver `docs/PRODUCTION_CHECKLIST.md`).

Programación diaria (cron del servidor):

```
15 3 * * * cd /opt/atajolab/apps/presupuestos && ./scripts/backup.sh >> backup.log 2>&1
```

## Restauración

```bash
./scripts/restore.sh backups/presupuestos-YYYYMMDDTHHMMSSZ.dump
```

**Destructivo**: reemplaza los datos (`pg_restore --clean`). Pide escribir `RESTAURAR` y detiene la app. Probar primero contra una base vacía de pruebas (nunca restaurar pruebas sobre la base de producción). Luego levantar la app con `./scripts/deploy.sh <tag>`.

## Qué se respalda

Toda la base: cuentas, presupuestos, clientes, pagos, suscripciones. Los backups contienen datos personales y hashes de contraseñas: tratarlos como secretos.
