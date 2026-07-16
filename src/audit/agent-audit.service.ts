import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AgentAuditLog } from './agent-audit-log.entity'

export interface RegistroAuditoria {
  tool: string
  modulo?: string | null
  proyectoId?: string | null
  usuarioId?: string | null
  canal?: string | null
  payload?: any
  confirmado?: boolean
  resultado?: 'ok' | 'error' | 'cancelado'
}

/** Registra TODA escritura de IA en la bitácora transversal. Nunca tumba el flujo si falla el log. */
@Injectable()
export class AgentAuditService {
  private readonly logger = new Logger(AgentAuditService.name)

  constructor(
    @InjectRepository(AgentAuditLog) private repo: Repository<AgentAuditLog>,
  ) {}

  async registrar(r: RegistroAuditoria): Promise<void> {
    try {
      await this.repo.save(this.repo.create({
        tool: r.tool,
        modulo: r.modulo ?? null,
        proyectoId: r.proyectoId ?? null,
        usuarioId: r.usuarioId ?? null,
        canal: r.canal ?? null,
        payload: r.payload ?? null,
        confirmado: r.confirmado ?? true,
        resultado: r.resultado ?? 'ok',
      }))
    } catch (e: any) {
      // La auditoría NUNCA debe romper la acción del usuario; solo lo logueamos.
      this.logger.warn(`No pude registrar auditoría de "${r.tool}": ${e?.message}`)
    }
  }

  /** Lista la auditoría de un proyecto (para futura UI de historial). */
  listar(proyectoId: string, limite = 100) {
    return this.repo.find({ where: { proyectoId }, order: { creadoEn: 'DESC' }, take: limite })
  }
}
