import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';

export enum NivelAcabados {
  BASICO = 'basico',
  ESTANDAR = 'estandar',
  PREMIUM = 'premium',
}

@Entity('acabados')
export class Acabados {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ type: 'enum', enum: NivelAcabados, nullable: true })
  nivel: NivelAcabados;

  @Column({ name: 'tipo_piso', nullable: true })
  tipoPiso: string;

  @Column({ name: 'tipo_paredes', nullable: true })
  tipoParedes: string;

  @Column({ name: 'tipo_carpinteria', nullable: true })
  tipoCarpinteria: string;

  @Column({ type: 'decimal', name: 'presupuesto_estimado', nullable: true })
  presupuestoEstimado: number;

  @OneToOne(() => Proyecto, (p) => p.acabados)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}
