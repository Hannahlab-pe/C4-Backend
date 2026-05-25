import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Entity('excavaciones')
export class Excavacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ type: 'decimal', name: 'profundidad_m', nullable: true })
  profundidadM: number;

  @Column({ name: 'tipo_suelo', nullable: true })
  tipoSuelo: string;

  @Column({ name: 'hay_cables', nullable: true })
  hayCables: boolean;

  @Column({ name: 'hay_tuberias', nullable: true })
  hayTuberias: boolean;

  @Column({ type: 'decimal', name: 'nivel_freatico', nullable: true })
  nivelFreatico: number;

  @Column({ nullable: true })
  maquinaria: string;

  @Column({ type: 'text', nullable: true })
  precauciones: string;

  @OneToOne(() => Proyecto, (p) => p.excavacion)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}
