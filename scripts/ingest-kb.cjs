/**
 * Ingesta de PDFs (normativas RNE, Revista Costos) a la Base de Conocimiento (RAG).
 * Reutiliza el mismo chunking/embedding que KnowledgeBaseService.
 *
 * Uso:  node scripts/ingest-kb.cjs "C:\\Users\\BDASUS 5\\Desktop\\DATA C4"
 *
 * Lee credenciales del .env del backend. Embeddings en lote (rápido).
 * Deduplica PDFs idénticos (por tamaño) y salta los escaneados (sin texto).
 */
const fs = require('fs')
const path = require('path')
const pdfParse = require('pdf-parse')
const { Client } = require('pg')
const axios = require('axios')

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100
const EMBED_BATCH = 96

function env(key, def = '') {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
    const m = raw.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : def
  } catch { return def }
}

const DIR = process.argv[2] || 'C:\\Users\\BDASUS 5\\Desktop\\DATA C4'
const OPENAI_API_KEY = env('OPENAI_API_KEY')

function chunkText(text) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = start + CHUNK_SIZE
    chunks.push(text.slice(start, end).trim())
    start = end - CHUNK_OVERLAP
  }
  return chunks.filter((c) => c.length > 50)
}

async function embedBatch(texts) {
  const { data } = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { model: 'text-embedding-3-small', input: texts.map((t) => t.slice(0, 8192)) },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 120000 },
  )
  return data.data.map((d) => d.embedding)
}

async function main() {
  if (!OPENAI_API_KEY) { console.error('Falta OPENAI_API_KEY en .env'); process.exit(1) }

  const client = new Client({
    host: env('DB_HOST', 'localhost'),
    port: parseInt(env('DB_PORT', '15432')),
    user: env('DB_USER', 'c4_user'),
    password: env('DB_PASS', 'c4_pass'),
    database: env('DB_NAME', 'c4_db'),
  })
  await client.connect()
  await client.query('CREATE EXTENSION IF NOT EXISTS vector')
  await client.query('ALTER TABLE knowledge_base_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)')

  // Listar PDFs de la raíz (ignora subcarpetas como /gruas) y deduplicar por tamaño
  const todos = fs.readdirSync(DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => ({ f, size: fs.statSync(path.join(DIR, f)).size }))
  const porTamano = new Map()
  for (const item of todos) {
    const prev = porTamano.get(item.size)
    // Preferir el nombre que empieza con "RNE_" (más limpio)
    if (!prev || (item.f.startsWith('RNE_') && !prev.f.startsWith('RNE_'))) porTamano.set(item.size, item)
  }
  const archivos = [...porTamano.values()].map((x) => x.f).sort()
  const duplicados = todos.length - archivos.length

  console.log(`\n${archivos.length} PDFs únicos a ingestar (${duplicados} duplicados omitidos)\n`)

  let okDocs = 0, skipDocs = 0, totalChunks = 0
  for (const f of archivos) {
    process.stdout.write(`  ${f.slice(0, 55).padEnd(57)} `)
    let parsed
    try {
      parsed = await pdfParse(fs.readFileSync(path.join(DIR, f)))
    } catch (e) {
      console.log('ERROR pdf-parse'); skipDocs++; continue
    }
    const texto = (parsed.text || '').replace(/\s+\n/g, '\n')
    if (texto.trim().length < 300) { console.log('SKIP (escaneado / sin texto)'); skipDocs++; continue }

    const chunks = chunkText(texto)
    await client.query('DELETE FROM knowledge_base_chunks WHERE documento_nombre = $1', [f])

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const lote = chunks.slice(i, i + EMBED_BATCH)
      const embs = await embedBatch(lote)
      // multi-row insert
      const values = []
      const params = []
      lote.forEach((c, j) => {
        const base = j * 4
        values.push(`(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector, '${JSON.stringify({ paginas: parsed.numpages, fuente: 'DATA C4' }).replace(/'/g, "''")}', NOW())`)
        params.push(f, i + j, c, `[${embs[j].join(',')}]`)
      })
      await client.query(
        `INSERT INTO knowledge_base_chunks (id, documento_nombre, chunk_index, contenido, embedding, metadata, created_at) VALUES ${values.join(',')}`,
        params,
      )
    }
    console.log(`OK · ${chunks.length} chunks`)
    okDocs++; totalChunks += chunks.length
  }

  const { rows } = await client.query('SELECT COUNT(*) FROM knowledge_base_chunks WHERE embedding IS NOT NULL')
  console.log(`\n✓ ${okDocs} documentos ingestados · ${totalChunks} chunks nuevos · ${skipDocs} omitidos`)
  console.log(`  Total chunks en la KB: ${rows[0].count}\n`)
  await client.end()
}

main().catch((e) => { console.error('FALLO:', e.message); process.exit(1) })
