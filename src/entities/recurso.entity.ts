import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

export type TipoRecurso = 'MO' | 'MAT' | 'EQP' | 'SUB'

/**
 * Recurso del catálogo maestro (Mano de Obra, Material, Equipo, Subcontrato).
 * El precio unitario ACTUAL vive aquí (fuente única de verdad); su historial en pre_recurso_precios.
 * Catálogo transversal (proyecto_id null) o con precio propio por proyecto (proyecto_id seteado).
 */
@Entity('pre_recursos')
@Index(['proyectoId', 'codigo'])
export class Recurso {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  codigo: string

  @Column()
  nombre: string

  @Column({ type: 'varchar', length: 3 })
  tipo: TipoRecurso

  @Column({ default: '' })
  familia: string

  @Column()
  unidad: string

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 14, scale: 4, default: 0 })
  precioUnitario: string

  @Column({ default: 'PEN' })
  moneda: string

  @Column({ name: 'proyecto_id', type: 'varchar', nullable: true })
  proyectoId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
