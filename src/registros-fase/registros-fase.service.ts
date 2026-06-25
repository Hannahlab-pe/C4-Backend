import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RegistroFase } from '../entities/registro-fase.entity'

@Injectable()
export class RegistrosFaseService {
  constructor(
    @InjectRepository(RegistroFase) private repo: Repository<RegistroFase>,
  ) {}

  listar(proyectoId: string, fase: string): Promise<RegistroFase[]> {
    return this.repo.find({ where: { proyectoId, fase }, order: { createdAt: 'ASC' } })
  }

  crear(proyectoId: string, fase: string, body: Partial<RegistroFase>): Promise<RegistroFase> {
    return this.repo.save(this.repo.create({
      proyectoId,
      fase,
      nombre: body.nombre ?? 'Registro',
      estado: body.estado ?? '',
      datos: body.datos ?? {},
    }))
  }

  async actualizar(id: string, body: Partial<RegistroFase>): Promise<RegistroFase> {
    const patch: Partial<RegistroFase> = {}
    if (body.nombre !== undefined) patch.nombre = body.nombre
    if (body.estado !== undefined) patch.estado = body.estado
    if (body.datos !== undefined) patch.datos = body.datos
    await this.repo.update(id, patch)
    return this.repo.findOneOrFail({ where: { id } })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  /** Reemplaza todos los registros de una fase (usado por la IA al generar el proyecto). */
  async reemplazar(proyectoId: string, fase: string, registros: Partial<RegistroFase>[]): Promise<number> {
    await this.repo.delete({ proyectoId, fase })
    const creados = registros.map((r) => this.repo.create({
      proyectoId,
      fase,
      nombre: String(r.nombre ?? 'Registro').slice(0, 200),
      estado: String(r.estado ?? '').slice(0, 50),
      datos: r.datos && typeof r.datos === 'object' ? r.datos : {},
    }))
    await this.repo.save(creados)
    return creados.length
  }
}
