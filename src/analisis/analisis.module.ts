import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalisisProyecto } from '../entities/analisis-proyecto.entity'
import { AnalisisService } from './analisis.service'
import { AnalisisController } from './analisis.controller'
import { MotoresModule } from '../motores/motores.module'
import { NormativasModule } from '../normativas/normativas.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalisisProyecto]),
    MotoresModule,      // exporta MotoresService
    NormativasModule,   // exporta NormativasService
  ],
  controllers: [AnalisisController],
  providers: [AnalisisService],
  exports: [AnalisisService],
})
export class AnalisisModule {}
