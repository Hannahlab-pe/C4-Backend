import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExcavacionRegistro } from '../entities/excavacion-registro.entity'
import { ExcavacionRegistrosService } from './excavacion-registros.service'
import { ExcavacionRegistrosController } from './excavacion-registros.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ExcavacionRegistro])],
  controllers: [ExcavacionRegistrosController],
  providers: [ExcavacionRegistrosService],
})
export class ExcavacionRegistrosModule {}
