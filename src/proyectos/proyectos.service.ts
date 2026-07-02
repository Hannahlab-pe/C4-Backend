import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { Proyecto } from '../entities/proyecto.entity'
import { ProyectoUsuario, RolEnProyecto } from '../entities/proyecto-usuario.entity'
import { Usuario, Rol } from '../entities/usuario.entity'
import { CreateProyectoDto } from './dto/create-proyecto.dto'

const FASES = ['demolicion', 'excavacion', 'construccion', 'acabados', 'administracion']

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto) private proyectoRepo: Repository<Proyecto>,
    @InjectRepository(ProyectoUsuario) private puRepo: Repository<ProyectoUsuario>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateProyectoDto, userId: string): Promise<Proyecto> {
    const proyecto = await this.proyectoRepo.save(this.proyectoRepo.create(dto))
    await this.puRepo.save(
      this.puRepo.create({ proyectoId: proyecto.id, usuarioId: userId, rolEnProyecto: RolEnProyecto.LIDER, rolObra: 'jefe_proyecto', fase: null }),
    )
    return proyecto
  }

  async update(id: string, userId: string, dto: { nombre?: string; distrito?: string }): Promise<Proyecto> {
    await this.exigirJefe(id, userId) // solo el jefe de proyecto edita los datos
    const proyecto = await this.proyectoRepo.findOne({ where: { id } })
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado')
    if (typeof dto.nombre === 'string' && dto.nombre.trim()) proyecto.nombre = dto.nombre.trim()
    if (typeof dto.distrito === 'string') proyecto.distrito = dto.distrito.trim()
    return this.proyectoRepo.save(proyecto)
  }

  // ── Equipo / roles del proyecto ────────────────────────────────────────────
  async miRol(proyectoId: string, userId: string): Promise<{ rolObra: string; fase: string | null }> {
    const link = await this.puRepo.findOne({ where: { proyectoId, usuarioId: userId } })
    if (!link) throw new ForbiddenException('No perteneces a este proyecto')
    return { rolObra: link.rolObra ?? (link.rolEnProyecto === RolEnProyecto.LIDER ? 'jefe_proyecto' : 'trabajador'), fase: link.fase ?? null }
  }

  private async exigirJefe(proyectoId: string, userId: string) {
    const r = await this.miRol(proyectoId, userId)
    if (r.rolObra !== 'jefe_proyecto') throw new ForbiddenException('Solo el jefe de proyecto puede gestionar el equipo')
  }

  async listarEquipo(proyectoId: string, userId: string) {
    await this.miRol(proyectoId, userId)
    const links = await this.puRepo.find({ where: { proyectoId }, order: { joinedAt: 'ASC' } })
    const usuarios = links.length ? await this.usuarioRepo.find({ where: { id: In(links.map((l) => l.usuarioId)) } }) : []
    const byId = new Map(usuarios.map((u) => [u.id, u]))
    return links.map((l) => this.unMiembro(l, byId.get(l.usuarioId)))
  }

  async crearMiembro(proyectoId: string, jefeId: string, body: { nombre: string; email: string; password: string; rolObra: string; fase?: string | null }) {
    await this.exigirJefe(proyectoId, jefeId)
    const nombre = (body.nombre ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const rolObra = ['jefe_fase', 'trabajador'].includes(body.rolObra) ? body.rolObra : 'trabajador'
    const fase = FASES.includes(body.fase ?? '') ? body.fase! : null
    if (!nombre || !email) throw new ForbiddenException('Nombre y email son obligatorios')
    if (!fase) throw new ForbiddenException('Asigna una fase al jefe/trabajador')

    let usuario = await this.usuarioRepo.findOne({ where: { email } })
    if (!usuario) {
      if (!body.password || body.password.length < 4) throw new ForbiddenException('La contraseña debe tener al menos 4 caracteres')
      usuario = await this.usuarioRepo.save(this.usuarioRepo.create({
        nombre, email, passwordHash: await bcrypt.hash(body.password, 10), rol: Rol.INGENIERO,
      }))
    }
    const ya = await this.puRepo.findOne({ where: { proyectoId, usuarioId: usuario.id } })
    if (ya) { ya.rolObra = rolObra; ya.fase = fase; await this.puRepo.save(ya); return this.unMiembro(ya, usuario) }
    const link = await this.puRepo.save(this.puRepo.create({
      proyectoId, usuarioId: usuario.id,
      rolEnProyecto: rolObra === 'jefe_fase' ? RolEnProyecto.SUPERVISOR : RolEnProyecto.INGENIERO,
      rolObra, fase,
    }))
    return this.unMiembro(link, usuario)
  }

  async actualizarMiembro(proyectoId: string, jefeId: string, miembroId: string, body: { rolObra?: string; fase?: string | null }) {
    await this.exigirJefe(proyectoId, jefeId)
    const link = await this.puRepo.findOne({ where: { id: miembroId, proyectoId } })
    if (!link) throw new NotFoundException('Miembro no encontrado')
    if (link.rolObra === 'jefe_proyecto') throw new ForbiddenException('No puedes cambiar el rol del jefe de proyecto')
    if (body.rolObra && ['jefe_fase', 'trabajador'].includes(body.rolObra)) link.rolObra = body.rolObra
    if (body.fase !== undefined && FASES.includes(body.fase ?? '')) link.fase = body.fase!
    await this.puRepo.save(link)
    return this.unMiembro(link, await this.usuarioRepo.findOne({ where: { id: link.usuarioId } }))
  }

  async eliminarMiembro(proyectoId: string, jefeId: string, miembroId: string) {
    await this.exigirJefe(proyectoId, jefeId)
    const link = await this.puRepo.findOne({ where: { id: miembroId, proyectoId } })
    if (!link) throw new NotFoundException('Miembro no encontrado')
    if (link.rolObra === 'jefe_proyecto') throw new ForbiddenException('No puedes quitar al jefe de proyecto')
    await this.puRepo.delete(link.id)
    return { ok: true }
  }

  private unMiembro(l: ProyectoUsuario, u?: Usuario | null) {
    return {
      id: l.id, usuarioId: l.usuarioId, nombre: u?.nombre ?? '—', email: u?.email ?? '',
      rolObra: l.rolObra ?? (l.rolEnProyecto === RolEnProyecto.LIDER ? 'jefe_proyecto' : 'trabajador'), fase: l.fase ?? null,
    }
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
