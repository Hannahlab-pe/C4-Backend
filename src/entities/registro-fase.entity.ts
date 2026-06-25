import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

// Registro operativo de una fase (demolición, vaciado de construcción, unidad de
// acabados, trámite de administración...). Los campos específicos de cada fase
// viven en `datos` (jsonb) según el esquema definido en el frontend/IA.
@Entity('registros_fase')
@Index(['proyectoId', 'fase'])
export class RegistroFase {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  fase: string

  @Column()
  nombre: string

  @Column({ default: '' })
  estado: string

  @Column({ type: 'jsonb', default: {} })
  datos: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
