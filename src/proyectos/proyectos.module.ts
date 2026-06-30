import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProyectosController } from './proyectos.controller'
import { ProyectosService } from './proyectos.service'
import { Proyecto } from '../entities/proyecto.entity'
import { ProyectoUsuario } from '../entities/proyecto-usuario.entity'
import { Usuario } from '../entities/usuario.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Proyecto, ProyectoUsuario, Usuario])],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
