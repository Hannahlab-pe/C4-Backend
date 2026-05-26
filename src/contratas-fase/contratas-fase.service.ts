import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContrataFase } from '../entities/contrata-fase.entity'

@Injectable()
export class ContratasFaseService {
  constructor(
    @InjectRepository(ContrataFase) private repo: Repository<ContrataFase>,
  ) {}

  listar(proyectoId: string, fase: string): Promise<ContrataFase[]> {
    return this.repo.find({ where: { proyectoId, fase }, order: { createdAt: 'ASC' } })
  }

  crear(proyectoId: string, fase: string, body: Partial<ContrataFase>): Promise<ContrataFase> {
    return this.repo.save(this.repo.create({ ...body, proyectoId, fase }))
  }

  async actualizar(id: string, body: Partial<ContrataFase>): Promise<ContrataFase> {
    await this.repo.update(id, body)
    return this.repo.findOneOrFail({ where: { id } })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
