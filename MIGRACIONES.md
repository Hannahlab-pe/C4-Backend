# Migraciones de base de datos

## Regla de oro
- **`synchronize` NUNCA en producción.** Se controla con la env var `DB_SYNC`:
  - **Dev/local** (`.env` con `DB_SYNC=true`): sincroniza el esquema desde las entidades (cómodo).
  - **Producción** (Railway, `DB_SYNC` sin setear → `false`): el esquema se cambia SOLO con migraciones
    explícitas, revisadas y corridas a mano. Así TypeORM nunca altera/borra tablas con datos de un
    cliente sin confirmación.

## Flujo para un cambio de esquema (antes de subir a prod)
```bash
# 1) Generar la migración (compara entidades vs la DB destino)
npm run migration:generate -- src/migrations/DescripcionDelCambio

# 2) REVISAR el archivo generado en src/migrations/ (que no haya DROP inesperados)

# 3) Correr en la DB (local o prod, según a qué apunte el .env)
npm run migration:run
```
Config del CLI: `src/data-source.ts` (lee `.env`). En runtime, la app puede correr migraciones al
arrancar si se setea `DB_MIGRATIONS_RUN=true` (útil para el deploy en Railway).

## Estado actual (módulo Presupuestos)
Las tablas `pre_*` (recursos, partidas, apu, presupuestos, items, polinómica, índices, adicionales,
audit) **aún no están en prod**. Antes del primer push del módulo a producción:
1. Con la DB destino accesible, correr `npm run migration:generate -- src/migrations/PresupuestosInit`.
2. Revisar el `CREATE TABLE` de cada `pre_*`.
3. `npm run migration:run` (o desplegar con `DB_MIGRATIONS_RUN=true`).

Mientras tanto, en local con Docker (`DB_SYNC=true`) las tablas se crean solas para desarrollar.
