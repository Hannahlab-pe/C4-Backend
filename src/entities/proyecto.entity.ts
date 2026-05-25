import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProyectoUsuario } from './proyecto-usuario.entity';
import { Sesion } from './sesion.entity';
import { Terreno } from './terreno.entity';
import { Excavacion } from './excavacion.entity';
import { Construccion } from './construccion.entity';
import { Acabados } from './acabados.entity';
import { Administracion } from './administracion.entity';
import { GanttFase } from './gantt-fase.entity';

export enum EstadoProyecto {
  BORRADOR = 'borrador',
  ACTIVO = 'activo',
  COMPLETADO = 'completado',
}

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  ubicacion: string;

  @Column({ nullable: true })
  distrito: string;

  @Column({ nullable: true })
  propietario: string;

  @Column({ nullable: true })
  empresa: string;

  @Column({
    type: 'enum',
    enum: EstadoProyecto,
    default: EstadoProyecto.BORRADOR,
  })
  estado: EstadoProyecto;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProyectoUsuario, (pu) => pu.proyecto)
  equipo: ProyectoUsuario[];

  @OneToMany(() => Sesion, (s) => s.proyecto)
  sesiones: Sesion[];

  @OneToOne(() => Terreno, (t) => t.proyecto)
  terreno: Terreno;

  @OneToOne(() => Excavacion, (e) => e.proyecto)
  excavacion: Excavacion;

  @OneToOne(() => Construccion, (c) => c.proyecto)
  construccion: Construccion;

  @OneToOne(() => Acabados, (a) => a.proyecto)
  acabados: Acabados;

  @OneToOne(() => Administracion, (a) => a.proyecto)
  administracion: Administracion;

  @OneToMany(() => GanttFase, (g) => g.proyecto)
  ganttFases: GanttFase[];
}
