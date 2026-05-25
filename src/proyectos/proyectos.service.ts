import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Proyecto } from '../entities/proyecto.entity'
import { ProyectoUsuario, RolEnProyecto } from '../entities/proyecto-usuario.entity'
import { CreateProyectoDto } from './dto/create-proyecto.dto'

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
    @InjectRepository(ProyectoUsuario) private puRepo: Repository<ProyectoUsuario>,
  ) {}

  async create(dto: CreateProyectoDto, userId: string): Promise<Proyecto> {
    const proyecto = await this.proyectoRepo.save(this.proyectoRepo.create(dto))
    await this.puRepo.save(
      this.puRepo.create({ proyectoId: proyecto.id, usuarioId: userId, rolEnProyecto: RolEnProyecto.LIDER }),
    )
    return proyecto
  }

  async findAll(userId: string): Promise<Proyecto[]> {
    const links = await this.puRepo.find({ where: { usuarioId: userId } })
    if (!links.length) return []
    const ids = links.map((l) => l.proyectoId)
    return this.proyectoRepo.find({ where: { id: In(ids) }, order: { createdAt: 'DESC' } })
  }

  async findOne(id: string): Promise<Proyecto> {
    const proyecto = await this.proyectoRepo.findOne({ where: { id } })
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado')
    return proyecto
  }
}
