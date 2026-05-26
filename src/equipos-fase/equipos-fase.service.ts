import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EquipoFase } from '../entities/equipo-fase.entity'

@Injectable()
export class EquiposFaseService {
  constructor(
    @InjectRepository(EquipoFase) private repo: Repository<EquipoFase>,
  ) {}

  listar(proyectoId: string, fase: string): Promise<EquipoFase[]> {
    return this.repo.find({ where: { proyectoId, fase }, order: { createdAt: 'ASC' } })
  }

  crear(proyectoId: string, fase: string, body: Partial<EquipoFase>): Promise<EquipoFase> {
    return this.repo.save(this.repo.create({ ...body, proyectoId, fase }))
  }

  async actualizar(id: string, body: Partial<EquipoFase>): Promise<EquipoFase> {
    await this.repo.update(id, body)
    return this.repo.findOneOrFail({ where: { id } })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
