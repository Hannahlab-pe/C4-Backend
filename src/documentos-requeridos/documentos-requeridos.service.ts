import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentoRequerido } from '../entities/documento-requerido.entity'

@Injectable()
export class DocumentosRequeridosService {
  constructor(
    @InjectRepository(DocumentoRequerido) private repo: Repository<DocumentoRequerido>,
  ) {}

  listar(proyectoId: string, fase: string): Promise<DocumentoRequerido[]> {
    return this.repo.find({ where: { proyectoId, fase }, order: { orden: 'ASC', createdAt: 'ASC' } })
  }

  crear(proyectoId: string, fase: string, body: Partial<DocumentoRequerido>): Promise<DocumentoRequerido> {
    return this.repo.save(this.repo.create({
      proyectoId, fase,
      nombre: body.nombre ?? 'Documento',
      descripcion: body.descripcion ?? '',
      entidad: body.entidad ?? '',
      obligatorio: body.obligatorio ?? true,
      estado: body.estado ?? 'pendiente',
      orden: body.orden ?? 0,
      notas: body.notas ?? '',
    }))
  }

  async actualizar(id: string, body: Partial<DocumentoRequerido>): Promise<DocumentoRequerido> {
    const patch: Partial<DocumentoRequerido> = {}
    for (const k of ['nombre', 'descripcion', 'entidad', 'obligatorio', 'estado', 'documentoId', 'orden', 'notas'] as const) {
      if (body[k] !== undefined) (patch as any)[k] = body[k]
    }
    await this.repo.update(id, patch)
    return this.repo.findOneOrFail({ where: { id } })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  /** Reemplaza el checklist de una fase (usado por la IA al generar el proyecto). */
  async reemplazar(proyectoId: string, fase: string, docs: Partial<DocumentoRequerido>[]): Promise<number> {
    // Conservar el estado/link de los que ya estaban completados (por nombre)
    const previos = await this.repo.find({ where: { proyectoId, fase } })
    const completados = new Map(previos.filter((p) => p.estado === 'subido').map((p) => [p.nombre.toLowerCase().trim(), p]))
    await this.repo.delete({ proyectoId, fase })
    const creados = docs.map((d, i) => {
      const prev = completados.get(String(d.nombre ?? '').toLowerCase().trim())
      return this.repo.create({
        proyectoId, fase,
        nombre: String(d.nombre ?? 'Documento').slice(0, 200),
        descripcion: String(d.descripcion ?? '').slice(0, 1000),
        entidad: String(d.entidad ?? '').slice(0, 120),
        obligatorio: d.obligatorio ?? true,
        estado: prev ? 'subido' : 'pendiente',
        documentoId: prev ? prev.documentoId : null,
        orden: i,
        notas: String(d.notas ?? '').slice(0, 500),
      })
    })
    await this.repo.save(creados)
    return creados.length
  }
}
