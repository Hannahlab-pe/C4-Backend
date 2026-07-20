import { MigrationInterface, QueryRunner } from "typeorm";

/** Tabla de valorizaciones (avance mensual para cobrar contra un presupuesto). */
export class Valorizaciones1785500000000 implements MigrationInterface {
    name = 'Valorizaciones1785500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pre_valorizaciones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "proyecto_id" character varying NOT NULL, "presupuesto_id" character varying NOT NULL, "numero" integer NOT NULL, "periodo" character varying NOT NULL, "estado" character varying NOT NULL DEFAULT 'borrador', "avances" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_pre_valorizaciones" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_pre_valorizaciones_pres_num" ON "pre_valorizaciones" ("presupuesto_id", "numero")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_pre_valorizaciones_pres_num"`);
        await queryRunner.query(`DROP TABLE "pre_valorizaciones"`);
    }
}
