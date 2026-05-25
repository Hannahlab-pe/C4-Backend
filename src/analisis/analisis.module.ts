import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalisisProyecto } from '../entities/analisis-proyecto.entity'
import { AnalisisService } from './analisis.service'

@Module({
  imports: [TypeOrmModule.forFeature([AnalisisProyecto])],
  providers: [AnalisisService],
  exports: [AnalisisService],
})
export class AnalisisModule {}
