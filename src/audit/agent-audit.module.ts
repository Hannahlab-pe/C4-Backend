import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AgentAuditLog } from './agent-audit-log.entity'
import { AgentAuditService } from './agent-audit.service'

@Module({
  imports: [TypeOrmModule.forFeature([AgentAuditLog])],
  providers: [AgentAuditService],
  exports: [AgentAuditService],
})
export class AgentAuditModule {}
