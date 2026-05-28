import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
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

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proyectos.delete(id, user.id)
  }
}
