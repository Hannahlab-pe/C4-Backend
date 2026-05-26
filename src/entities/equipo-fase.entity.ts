import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('equipos_fase')
export class EquipoFase {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  fase: string

  @Column()
  nombre: string

  @Column({ default: 'excavadora' })
  tipo: string

  @Column({ default: 'disponible' })
  estado: string

  @Column({ name: 'contrata_empresa', default: '' })
  contrataEmpresa: string

  @Column({ default: '' })
  ubicacion: string

  @Column({ default: '' })
  operador: string

  @Column({ type: 'int', default: 0, name: 'horas_trabajadas' })
  horasTrabajadas: number

  @Column({ name: 'mantenimiento_estado', default: 'al_dia' })
  mantenimientoEstado: string

  @Column({ type: 'text', default: '', nullable: true })
  notas: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
