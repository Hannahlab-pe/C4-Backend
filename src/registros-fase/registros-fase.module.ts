import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RegistroFase } from '../entities/registro-fase.entity'
import { RegistrosFaseController } from './registros-fase.controller'
import { RegistrosFaseService } from './registros-fase.service'

@Module({
  imports: [TypeOrmModule.forFeature([RegistroFase])],
  controllers: [RegistrosFaseController],
  providers: [RegistrosFaseService],
  exports: [RegistrosFaseService],
})
export class RegistrosFaseModule {}
