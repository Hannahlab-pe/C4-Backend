import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/** Historial de precios de un recurso (auditoría de cambios de precio unitario). */
@Entity('pre_recurso_precios')
@Index(['recursoId', 'fecha'])
export class RecursoPrecio {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'recurso_id' })
  recursoId: string

  @Column({ name: 'precio_anterior', type: 'decimal', precision: 14, scale: 4, nullable: true })
  precioAnterior: string | null

  @Column({ name: 'precio_nuevo', type: 'decimal', precision: 14, scale: 4 })
  precioNuevo: string

  @Column({ default: 'PEN' })
  moneda: string

  @Column({ name: 'usuario_id', type: 'varchar', nullable: true })
  usuarioId: string | null

  @Column({ type: 'timestamptz', default: () => 'now()' })
  fecha: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
