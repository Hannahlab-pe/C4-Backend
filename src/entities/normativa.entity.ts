import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { NormativaEmbedding } from './normativa-embedding.entity';

@Entity('normativas')
export class Normativa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  distrito: string;

  @Column({ nullable: true })
  ubigeo: string;

  @Column({ nullable: true })
  zonificacion: string;

  @Column({ name: 'pisos_max', nullable: true })
  pisosMax: number;

  @Column({ type: 'decimal', name: 'retiro_frontal', nullable: true })
  retiroFrontal: number;

  @Column({ type: 'decimal', name: 'retiro_lateral', nullable: true })
  retiroLateral: number;

  @Column({ type: 'decimal', name: 'retiro_posterior', nullable: true })
  retiroPosterior: number;

  @Column({ type: 'decimal', nullable: true })
  cus: number;

  @Column({ type: 'decimal', name: 'area_min_depto', nullable: true })
  areaMinDepto: number;

  @Column({ nullable: true })
  estacionamientos: number;

  @Column({ nullable: true })
  fuente: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => NormativaEmbedding, (e) => e.normativa)
  embeddings: NormativaEmbedding[];
}
