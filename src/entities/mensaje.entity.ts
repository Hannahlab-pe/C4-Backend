import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sesion } from './sesion.entity';

@Entity('mensajes')
export class Mensaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sesion_id' })
  sesionId: string;

  @Column()
  rol: string; // 'user' | 'assistant'

  @Column('text')
  contenido: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Sesion, (s) => s.mensajes)
  @JoinColumn({ name: 'sesion_id' })
  sesion: Sesion;
}
