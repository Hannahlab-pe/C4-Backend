import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Documento } from '../entities/documento.entity'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name)

  constructor(
    @InjectRepository(Documento)
    private repo: Repository<Documento>,
  ) {}

  async subir(params: {
    proyectoId: string
    nombre: string
    mimeType: string
    base64: string
  }): Promise<Documento> {
    const esPdf = params.mimeType === 'application/pdf'
    const esImagen = params.mimeType.startsWith('image/')
    const esDxf = params.mimeType.toLowerCase().includes('dxf') || params.nombre.toLowerCase().endsWith('.dxf')

    let textoExtraido: string | null = null
    let base64Guardado: string | null = null

    if (esPdf) {
      try {
        const buffer = Buffer.from(params.base64, 'base64')
        let parsed
        try { parsed = await pdfParse(buffer) }
        catch { parsed = await pdfParse(buffer) } // pdf-parse falla en su 1ra llamada por proceso; reintenta
        textoExtraido = parsed.text?.slice(0, 45000) ?? null
      } catch (err: any) {
        this.logger.error('Error extrayendo PDF:', err?.message)
      }
    } else if (esImagen || esDxf) {
      base64Guardado = params.base64  // imágenes (visión) y DXF (para modificar el plano)
    }

    const doc = this.repo.create({
      proyectoId: params.proyectoId,
      nombre: params.nombre,
      tipo: esPdf ? 'pdf' : esImagen ? 'image' : esDxf ? 'dxf' : 'otro',
      mimeType: params.mimeType,
      textoExtraido,
      base64: base64Guardado,
    })

    return this.repo.save(doc)
  }

  /** Guarda un archivo CONSERVANDO su base64 (para poder descargarlo luego, ej. el EMS). */
  async guardarArchivo(params: {
    proyectoId: string; nombre: string; mimeType: string; base64: string
  }): Promise<{ id: string; nombre: string }> {
    const esPdf = params.mimeType === 'application/pdf'
    let textoExtraido: string | null = null
    if (esPdf) {
      try {
        const buffer = Buffer.from(params.base64, 'base64')
        let parsed
        try { parsed = await pdfParse(buffer) } catch { parsed = await pdfParse(buffer) }
        textoExtraido = parsed.text?.slice(0, 45000) ?? null
      } catch { /* ignora */ }
    }
    const doc = this.repo.create({
      proyectoId: params.proyectoId,
      nombre: params.nombre,
      tipo: esPdf ? 'pdf' : params.mimeType.startsWith('image/') ? 'image' : 'otro',
      mimeType: params.mimeType,
      textoExtraido,
      base64: params.base64,
    })
    const saved = await this.repo.save(doc)
    return { id: saved.id, nombre: saved.nombre }
  }

  /** Devuelve un archivo con su base64 para descargarlo. */
  async obtenerArchivo(id: string): Promise<{ id: string; nombre: string; mimeType: string; base64: string } | null> {
    const doc = await this.repo.findOne({ where: { id } })
    if (!doc?.base64) return null
    return { id: doc.id, nombre: doc.nombre, mimeType: doc.mimeType ?? 'application/octet-stream', base64: doc.base64 }
  }

  /** Último DXF (plano) subido al proyecto, con su base64. */
  async ultimoDxf(proyectoId: string): Promise<{ id: string; nombre: string; base64: string } | null> {
    const doc = await this.repo.findOne({
      where: { proyectoId, tipo: 'dxf' },
      order: { createdAt: 'DESC' },
    })
    return doc?.base64 ? { id: doc.id, nombre: doc.nombre, base64: doc.base64 } : null
  }

  async listar(proyectoId: string): Promise<Documento[]> {
    return this.repo.find({
      where: { proyectoId },
      order: { createdAt: 'DESC' },
      select: { id: true, nombre: true, tipo: true, mimeType: true, createdAt: true },
    })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  /** Último documento subido al proyecto (para vincularlo a un documento requerido). */
  async ultimaSubida(proyectoId: string): Promise<{ id: string; nombre: string } | null> {
    const doc = await this.repo.findOne({
      where: { proyectoId },
      order: { createdAt: 'DESC' },
      select: { id: true, nombre: true },
    })
    return doc ? { id: doc.id, nombre: doc.nombre } : null
  }

  async getContextoParaLlm(proyectoId: string): Promise<string> {
    const docs = await this.repo.find({
      where: { proyectoId },
      order: { createdAt: 'ASC' },
    })

    if (!docs.length) return ''

    const partes: string[] = []

    for (const doc of docs) {
      if (doc.tipo === 'pdf' && doc.textoExtraido) {
        partes.push(`### Documento: ${doc.nombre}\n${doc.textoExtraido}`)
      }
    }

    if (!partes.length) return ''

    return `\n\n---\n## DOCUMENTOS DEL PROYECTO\nEl ingeniero ha subido los siguientes documentos de referencia. Úsalos para responder con mayor precisión:\n\n${partes.join('\n\n---\n')}\n---`
  }

  private norm(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  }

  /**
   * RAG por relevancia (sin embeddings): recupera de los documentos del proyecto los
   * FRAGMENTOS más relevantes a la consulta del usuario, con su fuente citada.
   * Así la IA responde sobre el EMS/planos citando de qué documento sacó cada dato.
   */
  async getContextoRelevante(proyectoId: string, query: string): Promise<string> {
    const docs = await this.repo.find({ where: { proyectoId }, order: { createdAt: 'ASC' } })
    const conTexto = docs.filter((d) => d.textoExtraido && d.textoExtraido.trim())
    if (!conTexto.length) return ''

    const STOP = new Set(['de', 'la', 'el', 'los', 'las', 'en', 'y', 'a', 'del', 'que', 'un', 'una', 'por', 'para', 'con', 'se', 'su', 'al', 'lo', 'como', 'mas', 'sobre', 'este', 'esta', 'cual', 'cuanto', 'donde', 'the', 'of'])
    const terms = [...new Set(this.norm(query || '').replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)))]

    // Sin términos útiles → lista de documentos disponibles (para que la IA sepa qué hay y cite)
    if (terms.length === 0) {
      const lista = conTexto.map((d) => `- ${d.nombre}`).join('\n')
      return `\n\n---\n## DOCUMENTOS DEL PROYECTO\nEl usuario subió estos documentos. Cuando uses un dato de ellos, CITA SIEMPRE el nombre del documento.\n${lista}\n---`
    }

    // Chunk + score por coincidencia de términos
    type Ch = { nombre: string; texto: string; score: number }
    const chunks: Ch[] = []
    const size = 1200, paso = 1000
    for (const d of conTexto) {
      const t = d.textoExtraido!
      for (let i = 0; i < t.length; i += paso) {
        const texto = t.slice(i, i + size)
        const n = this.norm(texto)
        let score = 0, distintos = 0
        for (const term of terms) {
          const c = n.split(term).length - 1
          if (c > 0) { distintos++; score += 1 + Math.min(c, 3) * 0.3 }
        }
        if (score > 0) chunks.push({ nombre: d.nombre, texto: texto.trim(), score: score + distintos })
        if (i + size >= t.length) break
      }
    }

    if (!chunks.length) {
      const lista = conTexto.map((d) => `- ${d.nombre}`).join('\n')
      return `\n\n---\n## DOCUMENTOS DEL PROYECTO\nHay estos documentos subidos (ninguno coincide directamente con lo que se preguntó):\n${lista}\nSi te preguntan por su contenido, di qué documentos hay y pide precisar.\n---`
    }

    chunks.sort((a, b) => b.score - a.score)
    const bloques = chunks.slice(0, 6).map((c) => `[Fuente: ${c.nombre}]\n${c.texto}`).join('\n\n---\n')
    return `\n\n---\n## FRAGMENTOS RELEVANTES DE LOS DOCUMENTOS (recuperados por relevancia a la consulta)\nÚsalos para responder. CITA SIEMPRE el documento [entre corchetes] de donde sacaste cada dato (ej. "Según el EMS M5673…"). Si la respuesta no está en estos fragmentos ni en el resto del contexto, dilo con honestidad.\n\n${bloques}\n---`
  }

  async getImagenesParaLlm(proyectoId: string): Promise<{ mimeType: string; base64: string; nombre: string }[]> {
    const docs = await this.repo.find({
      where: { proyectoId, tipo: 'image' },
      order: { createdAt: 'ASC' },
    })
    return docs
      .filter((d) => d.base64)
      .map((d) => ({ mimeType: d.mimeType!, base64: d.base64!, nombre: d.nombre }))
  }
}
