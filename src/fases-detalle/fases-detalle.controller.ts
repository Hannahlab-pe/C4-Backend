import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FasesDetalleService } from './fases-detalle.service'

@Controller('fases-detalle')
@UseGuards(AuthGuard('jwt'))
export class FasesDetalleController {
  constructor(private svc: FasesDetalleService) {}

  @Get(':proyectoId/:fase')
  async obtener(@Param('proyectoId') proyectoId: string, @Param('fase') fase: string) {
    const detalle = await this.svc.obtener(proyectoId, fase)
    return detalle ?? { datos: null }
  }

  @Put(':proyectoId/:fase')
  guardar(
    @Param('proyectoId') proyectoId: string,
    @Param('fase') fase: string,
    @Body() body: any,
  ) {
    return this.svc.guardar(proyectoId, fase, body?.datos ?? body ?? {})
  }
}
