import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('knowledge_base_chunks')
export class KnowledgeBaseChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'documento_nombre' })
  documentoNombre: string

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number

  @Column('text')
  contenido: string

  // embedding vector(1536) gestionado por SQL raw (OpenAI text-embedding-3-small)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
