import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Recurso } from '../entities/recurso.entity'
import { RecursoPrecio } from '../entities/recurso-precio.entity'
import { Partida } from '../entities/partida.entity'
import { ApuLineaEntity } from '../entities/apu-linea.entity'
import { Presupuesto } from '../entities/presupuesto.entity'
import { PresupuestoItem } from '../entities/presupuesto-item.entity'
import { AuditLog } from '../entities/audit-log.entity'
import { Valorizacion } from '../entities/valorizacion.entity'
import { PartidaCatalogo } from '../entities/partida-catalogo.entity'
import { PresupuestosService } from './presupuestos.service'
import { PresupuestosController } from './presupuestos.controller'
import { MotoresModule } from '../motores/motores.module'

@Module({
  imports: [TypeOrmModule.forFeature([Recurso, RecursoPrecio, Partida, ApuLineaEntity, Presupuesto, PresupuestoItem, AuditLog, Valorizacion, PartidaCatalogo]), MotoresModule],
  controllers: [PresupuestosController],
  providers: [PresupuestosService],
  exports: [PresupuestosService], // Gerencia de Proyectos consumirá esto más adelante.
})
export class PresupuestosModule {}
