import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum EstadoTarea {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada',
}

@Entity('tareas_fase')
export class TareaFase {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  fase: string

  @Column('text')
  texto: string

  @Column({ default: EstadoTarea.PENDIENTE })
  estado: string

  @Column({ type: 'int', default: 0 })
  orden: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
