import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContrataFase } from '../entities/contrata-fase.entity'
import { ContratasFaseService } from './contratas-fase.service'
import { ContratasFaseController } from './contratas-fase.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ContrataFase])],
  controllers: [ContratasFaseController],
  providers: [ContratasFaseService],
})
export class ContratasFaseModule {}
