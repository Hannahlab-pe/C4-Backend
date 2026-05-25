import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Entity('administracion')
export class Administracion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proyecto_id' })
  proyectoId: string;

  @Column({ type: 'decimal', name: 'presupuesto_total', nullable: true })
  presupuestoTotal: number;

  @Column({ type: 'date', name: 'fecha_inicio', nullable: true })
  fechaInicio: Date;

  @Column({ name: 'ingeniero_responsable', nullable: true })
  ingenieroResponsable: string;

  @Column({ name: 'contacto_propietario', nullable: true })
  contactoPropietario: string;

  @OneToOne(() => Proyecto, (p) => p.administracion)
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}
