import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Documento } from '../entities/documento.entity'
import { DocumentosService } from './documentos.service'
import { DocumentosController } from './documentos.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Documento])],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
