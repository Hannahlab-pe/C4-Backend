import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bitácora TRANSVERSAL de escrituras de IA (agent_audit_log).
 * Idempotente (IF NOT EXISTS): segura de correr aunque synchronize ya la haya creado.
 * En prod: correr este SQL en la Console ANTES de apagar synchronize, o habilitar
 * DB_MIGRATIONS_RUN=true en el deploy para que corra sola.
 */
export class AgentAuditLog1784200000000 implements MigrationInterface {
    name = 'AgentAuditLog1784200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "agent_audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tool" character varying NOT NULL, "modulo" character varying, "proyecto_id" character varying, "usuario_id" character varying, "canal" character varying, "payload" jsonb, "confirmado" boolean NOT NULL DEFAULT true, "resultado" character varying, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_agent_audit_log_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_audit_proyecto_creado" ON "agent_audit_log" ("proyecto_id", "creado_en")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_agent_audit_proyecto_creado"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "agent_audit_log"`);
    }
}
