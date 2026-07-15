import { MigrationInterface, QueryRunner } from "typeorm";

export class PresupuestosInit1784146931475 implements MigrationInterface {
    name = 'PresupuestosInit1784146931475'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pre_recursos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" character varying NOT NULL, "nombre" character varying NOT NULL, "tipo" character varying(3) NOT NULL, "familia" character varying NOT NULL DEFAULT '', "unidad" character varying NOT NULL, "precio_unitario" numeric(14,4) NOT NULL DEFAULT '0', "moneda" character varying NOT NULL DEFAULT 'PEN', "proyecto_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_86066956b1f3afedbf54a92f71d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8da9e339e4b015e26d8e8b65bf" ON "pre_recursos"  ("proyecto_id", "codigo") `);
        await queryRunner.query(`CREATE TABLE "pre_recurso_precios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recurso_id" character varying NOT NULL, "precio_anterior" numeric(14,4), "precio_nuevo" numeric(14,4) NOT NULL, "moneda" character varying NOT NULL DEFAULT 'PEN', "usuario_id" character varying, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_391f89927956ebae3e28d4cbe02" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b7a625ebef10e944996d679197" ON "pre_recurso_precios"  ("recurso_id", "fecha") `);
        await queryRunner.query(`CREATE TABLE "pre_partidas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" character varying NOT NULL, "descripcion" character varying NOT NULL, "unidad" character varying NOT NULL, "especialidad" character varying NOT NULL DEFAULT '', "es_subpartida" boolean NOT NULL DEFAULT false, "proyecto_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aad4969b9569067c87dac0b04da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5df8b4674817f5158ae40c99a2" ON "pre_partidas"  ("proyecto_id", "codigo") `);
        await queryRunner.query(`CREATE TABLE "pre_apu_lineas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "partida_id" character varying NOT NULL, "clase" character varying(8) NOT NULL, "ref_id" character varying NOT NULL, "cuadrilla" numeric(12,4), "rendimiento" numeric(12,4), "cantidad" numeric(14,4), "precio_snapshot" numeric(14,4), "parcial" numeric(14,2), "orden" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_a937c623d2938edc66dcb1c9100" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da8ca8aa1573931e80298fbc51" ON "pre_apu_lineas"  ("partida_id", "orden") `);
        await queryRunner.query(`CREATE TABLE "pre_presupuestos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "proyecto_id" character varying NOT NULL, "nombre" character varying NOT NULL, "tipo" character varying(12) NOT NULL, "moneda" character varying NOT NULL DEFAULT 'PEN', "tipo_cambio" numeric(10,4), "gg_fijo" numeric(14,2) NOT NULL DEFAULT '0', "gg_porcentaje" numeric(6,4) NOT NULL DEFAULT '0', "utilidad_porcentaje" numeric(6,4) NOT NULL DEFAULT '0', "igv_porcentaje" numeric(6,4) NOT NULL DEFAULT '0.18', "congelado" boolean NOT NULL DEFAULT false, "origen_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c819bbb947f49bc6a958f86b42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_88c8c278a292ad6c1cb1faa9df" ON "pre_presupuestos"  ("proyecto_id", "tipo") `);
        await queryRunner.query(`CREATE TABLE "pre_formulas_polinomicas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "presupuesto_id" character varying NOT NULL, "mes_base" character varying NOT NULL, "coeficientes" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2738644470ceea4e82fa2ae49b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6838921c000211a76500318986" ON "pre_formulas_polinomicas"  ("presupuesto_id") `);
        await queryRunner.query(`CREATE TABLE "pre_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "presupuesto_id" character varying NOT NULL, "parent_id" character varying, "tipo" character varying(8) NOT NULL, "codigo" character varying NOT NULL DEFAULT '', "descripcion" character varying NOT NULL DEFAULT '', "partida_id" character varying, "metrado" numeric(16,4), "costo_unitario_snapshot" numeric(14,2), "por_generico_snapshot" jsonb, "parcial" numeric(16,2), "orden" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_587b54b249d4f56b7fa7f988e58" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3dbf27b5463531b55e8f706fe7" ON "pre_items"  ("presupuesto_id", "parent_id", "orden") `);
        await queryRunner.query(`CREATE TABLE "pre_indices_unificados" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" character varying NOT NULL, "descripcion" character varying NOT NULL DEFAULT '', "anio" integer NOT NULL, "mes" integer NOT NULL, "valor" numeric(12,4) NOT NULL, CONSTRAINT "PK_7ad74787b4d205341c97115a1cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_33830b19ab5c76fb068c92ffd2" ON "pre_indices_unificados"  ("codigo", "anio", "mes") `);
        await queryRunner.query(`CREATE TABLE "pre_adicionales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "presupuesto_id" character varying NOT NULL, "tipo" character varying(10) NOT NULL, "descripcion" character varying NOT NULL DEFAULT '', "items" jsonb NOT NULL DEFAULT '[]', "monto" numeric(16,2) NOT NULL DEFAULT '0', "estado" character varying(12) NOT NULL DEFAULT 'borrador', "aprobado_por" character varying, "fecha" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5ce08ce13453f6c2862f8608f34" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9ae4d67ede9ec774ef6d2a44fe" ON "pre_adicionales"  ("presupuesto_id") `);
        await queryRunner.query(`CREATE TABLE "pre_audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entidad" character varying NOT NULL, "entidad_id" character varying NOT NULL, "usuario_id" character varying, "campo" character varying NOT NULL, "valor_anterior" text, "valor_nuevo" text, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_874d6fc87f2cdd7c9f2c3e34b7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c01daa0573ef061a1eac27a03" ON "pre_audit_log"  ("entidad", "entidad_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2c01daa0573ef061a1eac27a03"`);
        await queryRunner.query(`DROP TABLE "pre_audit_log"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ae4d67ede9ec774ef6d2a44fe"`);
        await queryRunner.query(`DROP TABLE "pre_adicionales"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_33830b19ab5c76fb068c92ffd2"`);
        await queryRunner.query(`DROP TABLE "pre_indices_unificados"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3dbf27b5463531b55e8f706fe7"`);
        await queryRunner.query(`DROP TABLE "pre_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6838921c000211a76500318986"`);
        await queryRunner.query(`DROP TABLE "pre_formulas_polinomicas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88c8c278a292ad6c1cb1faa9df"`);
        await queryRunner.query(`DROP TABLE "pre_presupuestos"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da8ca8aa1573931e80298fbc51"`);
        await queryRunner.query(`DROP TABLE "pre_apu_lineas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5df8b4674817f5158ae40c99a2"`);
        await queryRunner.query(`DROP TABLE "pre_partidas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b7a625ebef10e944996d679197"`);
        await queryRunner.query(`DROP TABLE "pre_recurso_precios"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8da9e339e4b015e26d8e8b65bf"`);
        await queryRunner.query(`DROP TABLE "pre_recursos"`);
    }

}
