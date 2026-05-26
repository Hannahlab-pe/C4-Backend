import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('contratas_fase')
export class ContrataFase {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  fase: string

  @Column()
  empresa: string

  @Column({ default: 'otro' })
  tipo: string

  @Column({ type: 'jsonb', default: [] })
  servicios: string[]

  @Column({ type: 'jsonb', default: [] })
  equipos: string[]

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'presupuesto_total' })
  presupuestoTotal: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'presupuesto_asignado' })
  presupuestoAsignado: number

  @Column({ name: 'contacto_nombre', default: '' })
  contactoNombre: string

  @Column({ name: 'contacto_telefono', default: '' })
  contactoTelefono: string

  @Column({ default: 'activo' })
  estado: string

  @Column({ default: 'parcial' })
  cobertura: string

  @Column({ type: 'text', default: '', nullable: true })
  notas: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
