import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatController } from './chat.controller'
import { WhatsappController } from './whatsapp.controller'
import { ChatService } from './chat.service'
import { LlmService } from './llm.service'
import { PdfService } from './pdf.service'
import { Sesion } from '../entities/sesion.entity'
import { Mensaje } from '../entities/mensaje.entity'
import { TareaFase } from '../entities/tarea-fase.entity'
import { EquipoFase } from '../entities/equipo-fase.entity'
import { MotoresModule } from '../motores/motores.module'
import { NormativasModule } from '../normativas/normativas.module'
import { DocumentosModule } from '../documentos/documentos.module'
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module'
import { AnalisisModule } from '../analisis/analisis.module'
import { ProyectosModule } from '../proyectos/proyectos.module'
import { FasesDetalleModule } from '../fases-detalle/fases-detalle.module'
import { RegistrosFaseModule } from '../registros-fase/registros-fase.module'
import { DocumentosRequeridosModule } from '../documentos-requeridos/documentos-requeridos.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Sesion, Mensaje, TareaFase, EquipoFase]),
    MotoresModule,
    NormativasModule,
    DocumentosModule,
    KnowledgeBaseModule,
    AnalisisModule,
    ProyectosModule,
    FasesDetalleModule,
    RegistrosFaseModule,
    DocumentosRequeridosModule,
  ],
  controllers: [ChatController, WhatsappController],
  providers: [ChatService, LlmService, PdfService],
})
export class ChatModule {}
