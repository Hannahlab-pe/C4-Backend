import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AgentAuditService } from './agent-audit.service'

/** Lado de lectura de la bitácora agent_audit_log (quién/qué escribió la IA en un proyecto). */
@Controller('auditoria')
@UseGuards(JwtAuthGuard)
export class AgentAuditController {
  constructor(private svc: AgentAuditService) {}

  /** Últimos registros de escritura de IA para un proyecto. */
  @Get(':proyectoId')
  listar(@Param('proyectoId') proyectoId: string, @Query('limite') limite?: string) {
    const n = limite ? parseInt(limite, 10) : 100
    return this.svc.listar(proyectoId, Number.isFinite(n) ? n : 100)
  }
}
