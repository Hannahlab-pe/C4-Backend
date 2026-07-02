import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../decorators/current-user.decorator'
import { ProyectosService } from './proyectos.service'
import { CreateProyectoDto } from './dto/create-proyecto.dto'

@Controller('proyectos')
@UseGuards(JwtAuthGuard)
export class ProyectosController {
  constructor(private proyectos: ProyectosService) {}

  @Post()
  create(@Body() dto: CreateProyectoDto, @CurrentUser() user: any) {
    return this.proyectos.create(dto, user.id)
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.proyectos.findAll(user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proyectos.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.proyectos.update(id, user.id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proyectos.delete(id, user.id)
  }

  // ── Equipo / roles ──
  @Get(':id/mi-rol')
  miRol(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proyectos.miRol(id, user.id)
  }

  @Get(':id/equipo')
  equipo(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proyectos.listarEquipo(id, user.id)
  }

  @Post(':id/equipo')
  crearMiembro(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.proyectos.crearMiembro(id, user.id, body)
  }

  @Patch(':id/equipo/:miembroId')
  actualizarMiembro(@Param('id') id: string, @Param('miembroId') miembroId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.proyectos.actualizarMiembro(id, user.id, miembroId, body)
  }

  @Delete(':id/equipo/:miembroId')
  eliminarMiembro(@Param('id') id: string, @Param('miembroId') miembroId: string, @CurrentUser() user: any) {
    return this.proyectos.eliminarMiembro(id, user.id, miembroId)
  }
}
