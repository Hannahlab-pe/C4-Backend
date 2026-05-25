import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProyectoUsuario } from './proyecto-usuario.entity';
import { Sesion } from './sesion.entity';

export enum Rol {
  ADMIN = 'admin',
  INGENIERO = 'ingeniero',
  SUPERVISOR = 'supervisor',
  CLIENTE = 'cliente',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.INGENIERO })
  rol: Rol;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => ProyectoUsuario, (pu) => pu.usuario)
  proyectos: ProyectoUsuario[];

  @OneToMany(() => Sesion, (s) => s.usuario)
  sesiones: Sesion[];
}
