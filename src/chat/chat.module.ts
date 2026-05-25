import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { LlmService } from './llm.service'
import { PdfService } from './pdf.service'
import { Sesion } from '../entities/sesion.entity'
import { Mensaje } from '../entities/mensaje.entity'
import { MotoresModule } from '../motores/motores.module'
import { NormativasModule } from '../normativas/normativas.module'
import { DocumentosModule } from '../documentos/documentos.module'
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module'
import { AnalisisModule } from '../analisis/analisis.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Sesion, Mensaje]),
    MotoresModule,
    NormativasModule,
    DocumentosModule,
    KnowledgeBaseModule,
    AnalisisModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, LlmService, PdfService],
})
export class ChatModule {}
