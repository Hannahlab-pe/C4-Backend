import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { PartidaCatalogo } from '../entities/partida-catalogo.entity'

@Injectable()
export class PartidasCatalogoService implements OnModuleInit {
  private readonly logger = new Logger(PartidasCatalogoService.name)

  constructor(
    @InjectRepository(PartidaCatalogo) private repo: Repository<PartidaCatalogo>,
  ) {}

  /** Al arrancar: si el catálogo está vacío, lo siembra desde el JSON bundleado. */
  async onModuleInit() {
    try {
      const n = await this.repo.count()
      if (n > 0) { this.logger.log(`Catálogo de partidas: ${n} partidas ya cargadas`); return }
      const file = path.join(__dirname, 'data', 'catalogo.json')
      if (!fs.existsSync(file)) { this.logger.warn(`No encontré el catálogo en ${file}`); return }
      const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as any[]
      const BATCH = 500
      for (let i = 0; i < data.length; i += BATCH) {
        await this.repo.insert(data.slice(i, i + BATCH))
      }
      this.logger.log(`Catálogo de partidas: sembradas ${data.length} partidas`)
    } catch (e: any) {
      this.logger.error(`Error sembrando catálogo de partidas: ${e?.message}`)
    }
  }

  /** Busca partidas del catálogo por texto (partida/sistema/subcapítulo/capítulo), con filtros opcionales. */
  async buscar(q: string, opts?: { fase?: string; especialidad?: string; limit?: number }): Promise<PartidaCatalogo[]> {
    const qb = this.repo.createQueryBuilder('p')
    const term = (q ?? '').trim()
    if (term) {
      qb.where(new Brackets((w) => {
        w.where('p.partida ILIKE :q', { q: `%${term}%` })
          .orWhere('p.sistema ILIKE :q', { q: `%${term}%` })
          .orWhere('p.subcapitulo ILIKE :q', { q: `%${term}%` })
          .orWhere('p.capitulo ILIKE :q', { q: `%${term}%` })
      }))
    }
    if (opts?.fase) qb.andWhere('p.fase ILIKE :fase', { fase: `%${opts.fase}%` })
    if (opts?.especialidad) qb.andWhere('p.especialidad ILIKE :esp', { esp: `%${opts.especialidad}%` })
    return qb.orderBy('p.codigo', 'ASC').limit(opts?.limit ?? 40).getMany()
  }

  contar(): Promise<number> {
    return this.repo.count()
  }
}
