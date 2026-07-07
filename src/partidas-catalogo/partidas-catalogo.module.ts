import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PartidaCatalogo } from '../entities/partida-catalogo.entity'
import { PartidasCatalogoService } from './partidas-catalogo.service'
import { PartidasCatalogoController } from './partidas-catalogo.controller'

@Module({
  imports: [TypeOrmModule.forFeature([PartidaCatalogo])],
  controllers: [PartidasCatalogoController],
  providers: [PartidasCatalogoService],
  exports: [PartidasCatalogoService],
})
export class PartidasCatalogoModule {}
