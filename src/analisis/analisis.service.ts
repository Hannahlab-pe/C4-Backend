import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AnalisisProyecto } from '../entities/analisis-proyecto.entity'

@Injectable()
export class AnalisisService {
  constructor(
    @InjectRepository(AnalisisProyecto) private repo: Repository<AnalisisProyecto>,
  ) {}

  async guardar(proyectoId: string, distrito: string, cabida: any, estructura: any, financiero: any): Promise<void> {
    const existing = await this.repo.findOne({ where: { proyectoId } })
    if (existing) {
      await this.repo.update(existing.id, { distrito, cabida, estructura, financiero })
    } else {
      await this.repo.save(this.repo.create({ proyectoId, distrito, cabida, estructura, financiero }))
    }
  }

  getByProyecto(proyectoId: string): Promise<AnalisisProyecto | null> {
    return this.repo.findOne({ where: { proyectoId } })
  }

  async guardarCronograma(proyectoId: string, cronograma: any): Promise<void> {
    const existing = await this.repo.findOne({ where: { proyectoId } })
    if (existing) {
      await this.repo.update(existing.id, { cronograma })
    } else {
      await this.repo.save(this.repo.create({ proyectoId, cronograma }))
    }
  }
}
