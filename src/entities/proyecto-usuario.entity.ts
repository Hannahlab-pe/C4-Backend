import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Usuario } from './usuario.entity';

export enum RolEnProyecto {
  LIDER = 'lider',
  INGENIERO = 'ingeniero',
  SUPERVISOR = 'supervisor',
  CLIENTE = 'cliente',
}

@Entity('proyecto_usuarios')
export class ProyectoUsuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({
    type: 'enum',
    enum: RolEnProyecto,
    default: RolEnProyecto.INGENIERO,
    name: 'rol_en_proyecto',
  })
  rolEnProyecto: RolEnProyecto;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ManyToOne(() => Proyecto, (p) => p.equipo)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @ManyToOne(() => Usuario, (u) => u.proyectos)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
