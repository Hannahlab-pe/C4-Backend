import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TareaFase } from '../entities/tarea-fase.entity'
import { TareasFaseController } from './tareas-fase.controller'
import { TareasFaseService } from './tareas-fase.service'

@Module({
  imports: [TypeOrmModule.forFeature([TareaFase])],
  controllers: [TareasFaseController],
  providers: [TareasFaseService],
})
export class TareasFaseModule {}
