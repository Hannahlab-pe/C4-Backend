import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';

export enum Topografia {
  PLANO = 'plano',
  PENDIENTE = 'pendiente',
  DESNIVEL = 'desnivel',
}

@Entity('terrenos')
export class Terreno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ type: 'decimal', name: 'area_m2', nullable: true })
  areaMq: number;

  @Column({ type: 'decimal', name: 'frente_ml', nullable: true })
  frenteMl: number;

  @Column({ type: 'decimal', name: 'fondo_ml', nullable: true })
  fondoMl: number;

  @Column({ type: 'enum', enum: Topografia, nullable: true })
  topografia: Topografia;

  @Column({ name: 'tipo_suelo', nullable: true })
  tipoSuelo: string;

  @OneToOne(() => Proyecto, (p) => p.terreno)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}
