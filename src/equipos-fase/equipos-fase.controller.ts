import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { EquiposFaseService } from './equipos-fase.service'

@Controller('equipos-fase')
@UseGuards(AuthGuard('jwt'))
export class EquiposFaseController {
  constructor(private svc: EquiposFaseService) {}

  @Get(':proyectoId/:fase')
  listar(@Param('proyectoId') proyectoId: string, @Param('fase') fase: string) {
    return this.svc.listar(proyectoId, fase)
  }

  @Post(':proyectoId/:fase')
  crear(@Param('proyectoId') proyectoId: string, @Param('fase') fase: string, @Body() body: any) {
    return this.svc.crear(proyectoId, fase, body)
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() body: any) {
    return this.svc.actualizar(id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string) {
    return this.svc.eliminar(id)
  }
}
