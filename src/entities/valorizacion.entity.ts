import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/**
 * Valorización de obra (avance mensual para cobrar). Se hace CONTRA un presupuesto:
 * cada período se registra el % de avance físico ACUMULADO por partida, y el motor calcula
 * cuánto se factura este período (valorizado acumulado − acumulado anterior) + GG/Ut/IGV.
 */
@Entity('pre_valorizaciones')
@Index(['presupuestoId', 'numero'])
export class Valorizacion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column({ name: 'presupuesto_id' })
  presupuestoId: string

  /** N° correlativo de la valorización (período). */
  @Column('int')
  numero: number

  /** Etiqueta del período, ej. "Agosto 2026". */
  @Column()
  periodo: string

  @Column({ default: 'borrador' })
  estado: string

  /** Avance físico ACUMULADO por partida: { [itemId]: % (0–100) }. */
  @Column({ type: 'jsonb', default: {} })
  avances: Record<string, number>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
