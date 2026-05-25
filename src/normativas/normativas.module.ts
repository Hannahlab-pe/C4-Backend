import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Normativa } from '../entities/normativa.entity'
import { NormativaEmbedding } from '../entities/normativa-embedding.entity'
import { NormativasService } from './normativas.service'
import { NormativasController } from './normativas.controller'
import { RagService } from './rag.service'

@Module({
  imports: [TypeOrmModule.forFeature([Normativa, NormativaEmbedding])],
  controllers: [NormativasController],
  providers: [NormativasService, RagService],
  exports: [NormativasService, RagService],
})
export class NormativasModule {}
