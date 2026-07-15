import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/**
 * Partida = unidad de trabajo presupuestable (ej. "Tarrajeo de muros interiores").
 * Su composición de costo (APU) vive en pre_apu_lineas. Una partida puede usarse como recurso
 * dentro de otra (sub-partida compuesta) cuando es_subpartida = true (o siempre, según su uso).
 */
@Entity('pre_partidas')
@Index(['proyectoId', 'codigo'])
export class Partida {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  codigo: string

  @Column()
  descripcion: string

  @Column()
  unidad: string

  @Column({ default: '' })
  especialidad: string

  @Column({ name: 'es_subpartida', default: false })
  esSubpartida: boolean

  @Column({ name: 'proyecto_id', type: 'varchar', nullable: true })
  proyectoId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
