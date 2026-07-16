import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AgentAuditLog } from './agent-audit-log.entity'
import { AgentAuditService } from './agent-audit.service'
import { AgentAuditController } from './agent-audit.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AgentAuditLog])],
  controllers: [AgentAuditController],
  providers: [AgentAuditService],
  exports: [AgentAuditService],
})
export class AgentAuditModule {}
