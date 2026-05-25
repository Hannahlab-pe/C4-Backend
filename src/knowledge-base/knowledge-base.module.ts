import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KnowledgeBaseController } from './knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base.service'
import { KnowledgeBaseChunk } from '../entities/knowledge-base-chunk.entity'

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBaseChunk])],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
