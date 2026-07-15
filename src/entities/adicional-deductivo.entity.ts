import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

export type TipoAdicional = 'adicional' | 'deductivo'
export type EstadoAdicional = 'borrador' | 'presentado' | 'aprobado' | 'rechazado'

/**
 * Adicional/Deductivo (change order): cambio al alcance posterior a la línea base. NUNCA sobrescribe
 * la línea base — queda registrado aparte, con su monto, aprobación y trazabilidad.
 */
@Entity('pre_adicionales')
@Index(['presupuestoId'])
export class AdicionalDeductivo {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** Presupuesto (línea base) sobre el que aplica. */
  @Column({ name: 'presupuesto_id' })
  presupuestoId: string

  @Column({ type: 'varchar', length: 10 })
  tipo: TipoAdicional

  @Column({ default: '' })
  descripcion: string

  /** Ítems afectados: [{ partidaId?, descripcion, metrado, costoUnitario, parcial, ... }]. */
  @Column({ type: 'jsonb', default: [] })
  items: any[]

  @Column({ type: 'decimal', precision: 16, scale: 2, default: 0 })
  monto: string

  @Column({ type: 'varchar', length: 12, default: 'borrador' })
  estado: EstadoAdicional

  @Column({ name: 'aprobado_por', type: 'varchar', nullable: true })
  aprobadoPor: string | null

  @Column({ type: 'timestamptz', nullable: true })
  fecha: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
