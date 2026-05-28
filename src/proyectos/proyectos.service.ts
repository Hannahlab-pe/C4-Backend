import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { Proyecto } from '../entities/proyecto.entity'
import { ProyectoUsuario, RolEnProyecto } from '../entities/proyecto-usuario.entity'
import { CreateProyectoDto } from './dto/create-proyecto.dto'

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
    @InjectRepository(ProyectoUsuario) private puRepo: Repository<ProyectoUsuario>,
    private dataSource: DataSource,
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

  async delete(id: string, userId: string): Promise<void> {
    const link = await this.puRepo.findOne({ where: { proyectoId: id, usuarioId: userId } })
    if (!link) throw new NotFoundException('Proyecto no encontrado')

    const qr = this.dataSource.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()

    try {
      await qr.manager.query(
        `DELETE FROM mensajes WHERE sesion_id IN (SELECT id FROM sesiones WHERE proyecto_id = $1)`,
        [id],
      )
      await qr.manager.query(`DELETE FROM sesiones WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM excavaciones_registro WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM tareas_fase WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM contratas_fase WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM equipos_fase WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM analisis_proyecto WHERE proyecto_id = $1`, [id])

      const docs: { nombre: string }[] = await qr.manager.query(
        `SELECT nombre FROM documento WHERE "proyectoId" = $1`,
        [id],
      )
      if (docs.length > 0) {
        const names = docs.map((d) => d.nombre)
        await qr.manager.query(
          `DELETE FROM knowledge_base_chunks WHERE documento_nombre = ANY($1::text[])`,
          [names],
        )
      }
      await qr.manager.query(`DELETE FROM documento WHERE "proyectoId" = $1`, [id])

      await qr.manager.query(`DELETE FROM terrenos WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM excavaciones WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM construcciones WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM acabados WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM administracion WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM gantt_fases WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM proyecto_usuarios WHERE proyecto_id = $1`, [id])
      await qr.manager.query(`DELETE FROM proyectos WHERE id = $1`, [id])

      await qr.commitTransaction()
    } catch (err) {
      await qr.rollbackTransaction()
      throw err
    } finally {
      await qr.release()
    }
  }
}
