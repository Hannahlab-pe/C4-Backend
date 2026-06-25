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
        textoExtraido = parsed.text?.slice(0, 12000) ?? null
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
