import { MigrationInterface, QueryRunner } from "typeorm";

/** Deducciones de valorización: adelanto amortizable + fondo de garantía (fracción, como gg/ut/igv). */
export class DeduccionesValorizacion1785600000000 implements MigrationInterface {
    name = 'DeduccionesValorizacion1785600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pre_presupuestos" ADD COLUMN IF NOT EXISTS "adelanto_pct" numeric(6,4) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "pre_presupuestos" ADD COLUMN IF NOT EXISTS "fondo_garantia_pct" numeric(6,4) NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pre_presupuestos" DROP COLUMN IF EXISTS "fondo_garantia_pct"`);
        await queryRunner.query(`ALTER TABLE "pre_presupuestos" DROP COLUMN IF EXISTS "adelanto_pct"`);
    }
}
