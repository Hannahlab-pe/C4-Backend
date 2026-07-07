import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PartidasCatalogoService } from './partidas-catalogo.service'

@Controller('partidas-catalogo')
@UseGuards(JwtAuthGuard)
export class PartidasCatalogoController {
  constructor(private svc: PartidasCatalogoService) {}

  @Get('buscar')
  buscar(
    @Query('q') q?: string,
    @Query('fase') fase?: string,
    @Query('especialidad') especialidad?: string,
  ) {
    return this.svc.buscar(q ?? '', { fase, especialidad })
  }

  @Get('contar')
  async contar() {
    return { total: await this.svc.contar() }
  }
}
