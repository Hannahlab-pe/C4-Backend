import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm'

// Secciones estructuradas de un módulo de fase (rellenadas por la IA, editables por el usuario).
// datos = { secciones: [{ titulo, tipo: 'kv'|'tabla'|'lista', kv?, columnas?, filas?, items? }] }
@Entity('fases_detalle')
@Index(['proyectoId', 'fase'], { unique: true })
export class FaseDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  fase: string

  @Column({ type: 'jsonb', default: {} })
  datos: Record<string, any>

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
