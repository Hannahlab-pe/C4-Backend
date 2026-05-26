import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EquipoFase } from '../entities/equipo-fase.entity'
import { EquiposFaseService } from './equipos-fase.service'
import { EquiposFaseController } from './equipos-fase.controller'

@Module({
  imports: [TypeOrmModule.forFeature([EquipoFase])],
  controllers: [EquiposFaseController],
  providers: [EquiposFaseService],
})
export class EquiposFaseModule {}
