import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FaseDetalle } from '../entities/fase-detalle.entity'

@Injectable()
export class FasesDetalleService {
  constructor(
    @InjectRepository(FaseDetalle) private repo: Repository<FaseDetalle>,
  ) {}

  obtener(proyectoId: string, fase: string): Promise<FaseDetalle | null> {
    return this.repo.findOne({ where: { proyectoId, fase } })
  }

  async guardar(proyectoId: string, fase: string, datos: any): Promise<FaseDetalle> {
    const existing = await this.repo.findOne({ where: { proyectoId, fase } })
    if (existing) {
      await this.repo.update(existing.id, { datos })
      return this.repo.findOneOrFail({ where: { id: existing.id } })
    }
    return this.repo.save(this.repo.create({ proyectoId, fase, datos }))
  }
}
