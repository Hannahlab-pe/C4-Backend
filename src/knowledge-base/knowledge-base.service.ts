import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name)

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector')
      await this.dataSource.query(`
        ALTER TABLE knowledge_base_chunks
        ADD COLUMN IF NOT EXISTS embedding vector(1536)
      `)
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_kb_embedding
        ON knowledge_base_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10)
      `)
      this.logger.log('knowledge_base pgvector inicializado')
    } catch (err: any) {
      this.logger.warn(`knowledge_base init: ${err.message}`)
    }
  }

  // ─── Embedding via OpenAI text-embedding-3-small ────────────────────────────

  private async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY no configurada')

    const { data } = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { model: 'text-embedding-3-small', input: text.slice(0, 8192) },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
    )
    return data.data[0].embedding as number[]
  }

  // ─── Chunking ────────────────────────────────────────────────────────────────

  private chunkText(text: string): string[] {
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = start + CHUNK_SIZE
      chunks.push(text.slice(start, end).trim())
      start = end - CHUNK_OVERLAP
    }
    return chunks.filter((c) => c.length > 50)
  }

  // ─── Ingest PDF ──────────────────────────────────────────────────────────────

  async ingestPdf(nombre: string, base64: string): Promise<{ chunks: number }> {
    // Eliminar versión anterior si existe
    await this.dataSource.query(
      'DELETE FROM knowledge_base_chunks WHERE documento_nombre = $1',
      [nombre],
    )

    const buffer = Buffer.from(base64, 'base64')
    const parsed = await pdfParse(buffer)
    const texto = parsed.text ?? ''

    if (!texto.trim()) {
      throw new Error('El PDF no tiene texto extraíble (puede ser escaneado)')
    }

    const chunks = this.chunkText(texto)
    this.logger.log(`Procesando "${nombre}": ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.generateEmbedding(chunks[i])
      const vectorStr = `[${embedding.join(',')}]`
      this.logger.log(`chunk ${i}: embedding dim=${embedding.length}, vecStr len=${vectorStr.length}`)

      const result = await this.dataSource.query(
        `INSERT INTO knowledge_base_chunks
           (id, documento_nombre, chunk_index, contenido, embedding, metadata, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())
         RETURNING id, (embedding IS NOT NULL) as has_emb`,
        [nombre, i, chunks[i], vectorStr, JSON.stringify({ paginas: parsed.numpages })],
      )
      this.logger.log(`chunk ${i} insertado: ${JSON.stringify(result[0])}`)
    }

    return { chunks: chunks.length }
  }

  // ─── Semantic search ─────────────────────────────────────────────────────────

  async search(query: string, limit = 5): Promise<KbResult[]> {
    const embedding = await this.generateEmbedding(query)
    const vectorStr = `[${embedding.join(',')}]`

    const rows = await this.dataSource.query(
      `SELECT documento_nombre, contenido, metadata,
              round((1 - (embedding <=> $1::vector))::numeric, 4) AS similarity
       FROM knowledge_base_chunks
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    )
    return rows
  }

  // ─── Admin queries ───────────────────────────────────────────────────────────

  async listarDocumentos(): Promise<DocumentoKb[]> {
    return this.dataSource.query(
      `SELECT documento_nombre as nombre,
              COUNT(*) as chunks,
              MIN(created_at) as created_at
       FROM knowledge_base_chunks
       GROUP BY documento_nombre
       ORDER BY MIN(created_at) DESC`,
    )
  }

  async eliminarDocumento(nombre: string): Promise<void> {
    await this.dataSource.query(
      'DELETE FROM knowledge_base_chunks WHERE documento_nombre = $1',
      [nombre],
    )
  }
}

export interface KbResult {
  documento_nombre: string
  contenido: string
  metadata: Record<string, any>
  similarity: number
}

export interface DocumentoKb {
  nombre: string
  chunks: number
  created_at: Date
}
