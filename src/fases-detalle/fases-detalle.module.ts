import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FaseDetalle } from '../entities/fase-detalle.entity'
import { FasesDetalleController } from './fases-detalle.controller'
import { FasesDetalleService } from './fases-detalle.service'

@Module({
  imports: [TypeOrmModule.forFeature([FaseDetalle])],
  controllers: [FasesDetalleController],
  providers: [FasesDetalleService],
  exports: [FasesDetalleService],
})
export class FasesDetalleModule {}
