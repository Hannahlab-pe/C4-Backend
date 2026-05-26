import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ExcavacionRegistro } from '../entities/excavacion-registro.entity'

@Injectable()
export class ExcavacionRegistrosService {
  constructor(
    @InjectRepository(ExcavacionRegistro) private repo: Repository<ExcavacionRegistro>,
  ) {}

  listar(proyectoId: string): Promise<ExcavacionRegistro[]> {
    return this.repo.find({ where: { proyectoId }, order: { createdAt: 'ASC' } })
  }

  crear(proyectoId: string, body: Partial<ExcavacionRegistro>): Promise<ExcavacionRegistro> {
    return this.repo.save(this.repo.create({ ...body, proyectoId }))
  }

  async actualizar(id: string, body: Partial<ExcavacionRegistro>): Promise<ExcavacionRegistro> {
    await this.repo.update(id, body)
    return this.repo.findOneOrFail({ where: { id } })
  }

  async eliminar(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
