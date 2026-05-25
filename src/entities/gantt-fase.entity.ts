import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';

export enum FaseGantt {
  DEMOLICION = 'demolicion',
  EXCAVACION = 'excavacion',
  CIMENTACION = 'cimentacion',
  ESTRUCTURA = 'estructura',
  ACABADOS = 'acabados',
  ENTREGA = 'entrega',
}

export enum EstadoFase {
  PENDIENTE = 'pendiente',
  EN_CURSO = 'en_curso',
  COMPLETADO = 'completado',
}

@Entity('gantt_fases')
export class GanttFase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ type: 'enum', enum: FaseGantt })
  fase: FaseGantt;

  @Column()
  orden: number;

  @Column({ name: 'duracion_dias', nullable: true })
  duracionDias: number;

  @Column({ type: 'date', name: 'fecha_inicio', nullable: true })
  fechaInicio: Date;

  @Column({ type: 'date', name: 'fecha_fin', nullable: true })
  fechaFin: Date;

  @Column({
    type: 'enum',
    enum: EstadoFase,
    default: EstadoFase.PENDIENTE,
  })
  estado: EstadoFase;

  @ManyToOne(() => Proyecto, (p) => p.ganttFases)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}
