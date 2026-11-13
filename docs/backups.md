# Backups y restauración

Scripts en `deploy/scripts/` (verificados en local: backup de una base con datos y restauración en una base vacía con las 16 tablas).

## Backup

```bash
./scripts/backup.sh
```

- Usa `pg_dump -Fc` (comprimido) dentro de un contenedor `postgres:17-alpine`; no requiere cliente de PostgreSQL en el host.
- Guarda en `BACKUP_DIR` (por defecto `./backups`, permisos 700/600) y borra los de más de `BACKUP_RETENTION_DAYS` (14).
- Si la base está en una red Docker, definir `PG_DOCKER_NETWORK`.
- `deploy.sh` ejecuta un backup antes de cada despliegue y aborta si falla.

Programación diaria (cron del servidor):

```
15 3 * * * cd /opt/presupuestos && ./scripts/backup.sh >> /var/log/presupuestos-backup.log 2>&1
```

Recomendado: copiar los backups fuera del VPS (por ejemplo, almacenamiento de objetos o Storage Box de Hetzner). No está automatizado.

## Restauración

```bash
./scripts/restore.sh backups/presupuestos-YYYYMMDDTHHMMSSZ.dump
```

**Destructivo**: reemplaza los datos (`pg_restore --clean`). Pide escribir `RESTAURAR` y detiene la app. Probar primero contra una base vacía de pruebas. Luego levantar la app con `./scripts/deploy.sh <tag>`.

## Qué se respalda

Toda la base: cuentas, presupuestos, clientes, pagos, suscripciones. Los backups contienen datos personales y hashes de contraseñas: tratarlos como secretos.
