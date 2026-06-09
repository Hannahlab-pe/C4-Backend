import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm'

@Entity('analisis_proyecto')
export class AnalisisProyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id', unique: true })
  proyectoId: string

  @Column({ nullable: true })
  distrito: string

  @Column({ type: 'jsonb', nullable: true })
  cabida: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  estructura: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  financiero: Record<string, any>

  // Estado editable del Gantt de pre-inversión: { inicioISO, frentes, duraciones }
  @Column({ type: 'jsonb', nullable: true })
  cronograma: Record<string, any>

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
