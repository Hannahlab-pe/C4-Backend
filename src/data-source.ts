import 'dotenv/config'
import { DataSource } from 'typeorm'

/**
 * DataSource para la CLI de migraciones de TypeORM (NO lo usa la app en runtime — eso es app.module).
 *
 * En PRODUCCIÓN el esquema se maneja con migraciones EXPLÍCITAS, revisadas y corridas a mano
 * (synchronize queda apagado). Flujo:
 *   1) npm run migration:generate -- src/migrations/NombreDelCambio   (compara entidades vs DB)
 *   2) revisar el archivo generado en src/migrations/
 *   3) npm run migration:run                                          (aplica en la DB)
 * Nunca dejar que TypeORM altere/borre tablas solo con datos de clientes.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '15432', 10),
  username: process.env.DB_USER ?? 'c4_user',
  password: process.env.DB_PASS ?? 'c4_pass',
  database: process.env.DB_NAME ?? 'c4_db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'migration'],
})
