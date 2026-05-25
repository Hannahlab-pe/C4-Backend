import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Normativa } from './normativa.entity'

@Entity('normativas_embeddings')
export class NormativaEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'normativa_id' })
  normativaId: string

  @Column('text')
  contenido: string

  // embedding column (vector(768)) es gestionada por RagService via SQL raw
  // TypeORM no la gestiona para evitar conflictos con el tipo vector de pgvector

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  @ManyToOne(() => Normativa, (n) => n.embeddings)
  @JoinColumn({ name: 'normativa_id' })
  normativa: Normativa
}
