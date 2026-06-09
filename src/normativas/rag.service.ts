import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name)

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector')
      await this.dataSource.query(`
        ALTER TABLE normativas_embeddings
        ADD COLUMN IF NOT EXISTS embedding vector(768)
      `)
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_norm_emb_vec
        ON normativas_embeddings USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10)
      `)
      this.logger.log('pgvector inicializado')
    } catch (err) {
      this.logger.warn(`pgvector init: ${err.message}`)
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const provider = this.config.get('EMBEDDING_PROVIDER', 'mock')

    if (provider === 'ollama') {
      const url = this.config.get('OLLAMA_URL', 'http://localhost:11434')
      const { data } = await axios.post(`${url}/api/embeddings`, {
        model: 'nomic-embed-text',
        prompt: text,
      })
      return data.embedding
    }

    // Mock determinístico: mismo texto = mismo vector (útil para tests)
    const seed = text.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const vec = Array.from({ length: 768 }, (_, i) => Math.sin(seed * 0.01 + i * 0.1))
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
    return vec.map((v) => v / norm)
  }

  async countEmbeddings(normativaId: string): Promise<[{ count: string }]> {
    return this.dataSource.query(
      `SELECT COUNT(*) as count FROM normativas_embeddings
       WHERE normativa_id = $1 AND embedding IS NOT NULL`,
      [normativaId],
    )
  }

  async cleanupNullEmbeddings(): Promise<void> {
    await this.dataSource.query(
      'DELETE FROM normativas_embeddings WHERE embedding IS NULL',
    )
  }

  async insertEmbedding(
    normativaId: string,
    contenido: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const embedding = await this.generateEmbedding(contenido)
    const vectorStr = `[${embedding.join(',')}]`
    this.logger.debug(`insertEmbedding: dim=${embedding.length} str_len=${vectorStr.length} norm_id=${normativaId.slice(0, 8)}`)

    const result = await this.dataSource.query(
      `INSERT INTO normativas_embeddings (normativa_id, contenido, embedding, metadata)
       VALUES ($1, $2, $3::vector, $4)
       RETURNING id, (embedding IS NOT NULL) AS emb_ok`,
      [normativaId, contenido, vectorStr, JSON.stringify(metadata)],
    )
    this.logger.debug(`insertEmbedding result: ${JSON.stringify(result[0])}`)
  }

  async deleteEmbeddingsByNormativa(normativaId: string): Promise<void> {
    await this.dataSource.query(
      'DELETE FROM normativas_embeddings WHERE normativa_id = $1',
      [normativaId],
    )
  }

  async search(query: string, distrito?: string, limit = 5): Promise<RagResult[]> {
    const embedding = await this.generateEmbedding(query)
    const vectorStr = `[${embedding.join(',')}]`

    if (distrito) {
      return this.dataSource.query(
        `SELECT ne.contenido, ne.metadata, n.distrito,
                round((1 - (ne.embedding <=> $1::vector))::numeric, 4) AS similarity
         FROM normativas_embeddings ne
         JOIN normativas n ON n.id = ne.normativa_id
         WHERE LOWER(n.distrito) = LOWER($2)
         ORDER BY ne.embedding <=> $1::vector
         LIMIT $3`,
        [vectorStr, distrito, limit],
      )
    }

    return this.dataSource.query(
      `SELECT ne.contenido, ne.metadata, n.distrito,
              round((1 - (ne.embedding <=> $1::vector))::numeric, 4) AS similarity
       FROM normativas_embeddings ne
       JOIN normativas n ON n.id = ne.normativa_id
       ORDER BY ne.embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    )
  }
}

export interface RagResult {
  contenido: string
  metadata: Record<string, any>
  distrito: string
  similarity: number
}
