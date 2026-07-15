import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

export type TipoPresupuesto = 'meta' | 'venta' | 'linea_base'

/**
 * Cabecera de un presupuesto. Los tres tipos (meta / venta / línea_base) son entidades
 * independientes relacionadas por `origen_id` (de qué presupuesto se duplicó). La línea base va
 * `congelado = true` y no se edita directamente: los cambios pasan por adicionales/deductivos.
 * Porcentajes guardados como FRACCIÓN (0.10 = 10%). IGV por defecto 0.18.
 */
@Entity('pre_presupuestos')
@Index(['proyectoId', 'tipo'])
export class Presupuesto {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  nombre: string

  @Column({ type: 'varchar', length: 12 })
  tipo: TipoPresupuesto

  @Column({ default: 'PEN' })
  moneda: string

  @Column({ name: 'tipo_cambio', type: 'decimal', precision: 10, scale: 4, nullable: true })
  tipoCambio: string | null

  @Column({ name: 'gg_fijo', type: 'decimal', precision: 14, scale: 2, default: 0 })
  ggFijo: string

  @Column({ name: 'gg_porcentaje', type: 'decimal', precision: 6, scale: 4, default: 0 })
  ggPorcentaje: string

  @Column({ name: 'utilidad_porcentaje', type: 'decimal', precision: 6, scale: 4, default: 0 })
  utilidadPorcentaje: string

  @Column({ name: 'igv_porcentaje', type: 'decimal', precision: 6, scale: 4, default: 0.18 })
  igvPorcentaje: string

  @Column({ default: false })
  congelado: boolean

  /** De qué presupuesto se duplicó (meta → venta → línea base). */
  @Column({ name: 'origen_id', type: 'varchar', nullable: true })
  origenId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
