import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TareaFase } from '../entities/tarea-fase.entity'

@Injectable()
export class TareasFaseService {
  constructor(
    @InjectRepository(TareaFase) private repo: Repository<TareaFase>,
  ) {}

  listar(proyectoId: string, fase: string): Promise<TareaFase[]> {
    return this.repo.find({
      where: { proyectoId, fase },
      order: { orden: 'ASC', createdAt: 'ASC' },
    })
  }

  async crear(proyectoId: string, fase: string, texto: string): Promise<TareaFase> {
    const count = await this.repo.count({ where: { proyectoId, fase } })
    return this.repo.save(
      this.repo.create({ proyectoId, fase, texto, orden: count }),
    )
  }

  async actualizarEstado(id: string, estado: string): Promise<TareaFase> {
    await this.repo.update(id, { estado })
    return this.repo.findOneOrFail({ where: { id } })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
