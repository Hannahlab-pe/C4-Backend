import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';

export enum UsoProyecto {
  VIVIENDA = 'vivienda',
  COMERCIO = 'comercio',
  MIXTO = 'mixto',
  OFICINAS = 'oficinas',
}

export enum SistemaEstructural {
  MUROS_PORTANTES = 'muros_portantes',
  APORTICADO = 'aporticado',
  MIXTO = 'mixto',
}

@Entity('construcciones')
export class Construccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ nullable: true })
  pisos: number;

  @Column({ type: 'enum', enum: UsoProyecto, nullable: true })
  uso: UsoProyecto;

  @Column({
    type: 'enum',
    enum: SistemaEstructural,
    name: 'sistema_estructural',
    nullable: true,
  })
  sistemaEstructural: SistemaEstructural;

  @Column({ type: 'decimal', name: 'area_construida_m2', nullable: true })
  areaConstruidaMq: number;

  @OneToOne(() => Proyecto, (p) => p.construccion)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}
