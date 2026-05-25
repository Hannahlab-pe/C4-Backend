import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TareasFaseService } from './tareas-fase.service'

@Controller('tareas-fase')
@UseGuards(AuthGuard('jwt'))
export class TareasFaseController {
  constructor(private svc: TareasFaseService) {}

  @Get(':proyectoId/:fase')
  listar(@Param('proyectoId') proyectoId: string, @Param('fase') fase: string) {
    return this.svc.listar(proyectoId, fase)
  }

  @Post(':proyectoId/:fase')
  crear(
    @Param('proyectoId') proyectoId: string,
    @Param('fase') fase: string,
    @Body('texto') texto: string,
  ) {
    return this.svc.crear(proyectoId, fase, texto)
  }

  @Patch(':id/estado')
  actualizar(@Param('id') id: string, @Body('estado') estado: string) {
    return this.svc.actualizarEstado(id, estado)
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string) {
    return this.svc.eliminar(id)
  }
}
