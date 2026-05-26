import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ExcavacionRegistrosService } from './excavacion-registros.service'

@Controller('excavacion-registros')
@UseGuards(AuthGuard('jwt'))
export class ExcavacionRegistrosController {
  constructor(private svc: ExcavacionRegistrosService) {}

  @Get(':proyectoId')
  listar(@Param('proyectoId') proyectoId: string) {
    return this.svc.listar(proyectoId)
  }

  @Post(':proyectoId')
  crear(@Param('proyectoId') proyectoId: string, @Body() body: any) {
    return this.svc.crear(proyectoId, body)
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
