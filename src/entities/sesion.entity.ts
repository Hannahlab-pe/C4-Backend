import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Usuario } from './usuario.entity';
import { Mensaje } from './mensaje.entity';

export enum EstadoSesion {
  ACTIVA = 'activa',
  COMPLETADA = 'completada',
  PAUSADA = 'pausada',
}

@Entity('sesiones')
export class Sesion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({
    type: 'enum',
    enum: EstadoSesion,
    default: EstadoSesion.ACTIVA,
  })
  estado: EstadoSesion;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Proyecto, (p) => p.sesiones)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @ManyToOne(() => Usuario, (u) => u.sesiones)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany(() => Mensaje, (m) => m.sesion)
  mensajes: Mensaje[];
}
