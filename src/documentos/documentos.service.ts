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

    let textoExtraido: string | null = null
    let base64Guardado: string | null = null

    if (esPdf) {
      try {
        const buffer = Buffer.from(params.base64, 'base64')
        const parsed = await pdfParse(buffer)
        textoExtraido = parsed.text?.slice(0, 12000) ?? null
      } catch (err: any) {
        this.logger.error('Error extrayendo PDF:', err?.message)
      }
    } else if (esImagen) {
      base64Guardado = params.base64
    }

    const doc = this.repo.create({
      proyectoId: params.proyectoId,
      nombre: params.nombre,
      tipo: esPdf ? 'pdf' : esImagen ? 'image' : 'otro',
      mimeType: params.mimeType,
      textoExtraido,
      base64: base64Guardado,
    })

    return this.repo.save(doc)
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
