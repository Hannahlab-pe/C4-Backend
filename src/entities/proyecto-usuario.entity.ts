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

  // Rol de obra: 'jefe_proyecto' | 'jefe_fase' | 'trabajador'
  @Column({ name: 'rol_obra', type: 'varchar', length: 30, nullable: true })
  rolObra: string | null;

  // Fase asignada (para jefe_fase / trabajador). null = todas (jefe_proyecto)
  @Column({ type: 'varchar', length: 30, nullable: true })
  fase: string | null;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ManyToOne(() => Proyecto, (p) => p.equipo)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @ManyToOne(() => Usuario, (u) => u.proyectos)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
