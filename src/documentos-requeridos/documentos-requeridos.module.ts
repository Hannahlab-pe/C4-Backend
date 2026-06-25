import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocumentoRequerido } from '../entities/documento-requerido.entity'
import { DocumentosRequeridosController } from './documentos-requeridos.controller'
import { DocumentosRequeridosService } from './documentos-requeridos.service'

@Module({
  imports: [TypeOrmModule.forFeature([DocumentoRequerido])],
  controllers: [DocumentosRequeridosController],
  providers: [DocumentosRequeridosService],
  exports: [DocumentosRequeridosService],
})
export class DocumentosRequeridosModule {}
