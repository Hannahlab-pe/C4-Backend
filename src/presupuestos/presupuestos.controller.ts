import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CurrentUser } from '../decorators/current-user.decorator'
import { PresupuestosService } from './presupuestos.service'

type JwtUser = { sub: string; email: string; rol: string }

@Controller('presupuestos')
@UseGuards(AuthGuard('jwt'))
export class PresupuestosController {
  constructor(private svc: PresupuestosService) {}

  // ── Recursos (catálogo maestro) ──
  @Get('recursos')
  listarRecursos(@Query('proyectoId') proyectoId?: string) { return this.svc.listarRecursos(proyectoId) }

  @Post('recursos')
  crearRecurso(@Body() body: any) { return this.svc.crearRecurso(body) }

  @Patch('recursos/:id/precio')
  actualizarPrecio(@Param('id') id: string, @Body('precio') precio: number, @CurrentUser() u: JwtUser) {
    return this.svc.actualizarPrecioRecurso(id, precio, u?.sub)
  }

  // ── Partidas + APU ──
  @Get('partidas')
  listarPartidas(@Query('proyectoId') proyectoId?: string) { return this.svc.listarPartidas(proyectoId) }

  @Post('partidas')
  crearPartida(@Body() body: any) { return this.svc.crearPartida(body) }

  @Get('partidas/:id/apu')
  getApu(@Param('id') id: string) { return this.svc.getApu(id) }

  @Put('partidas/:id/apu')
  setApu(@Param('id') id: string, @Body('lineas') lineas: any[], @CurrentUser() u: JwtUser) {
    return this.svc.setApu(id, lineas, u?.sub)
  }

  // ── Items del árbol (por id de item) ──
  @Patch('items/:itemId')
  actualizarItem(@Param('itemId') itemId: string, @Body() body: any, @CurrentUser() u: JwtUser) {
    return this.svc.actualizarItem(itemId, body, u?.sub)
  }

  @Delete('items/:itemId')
  @HttpCode(200)
  eliminarItem(@Param('itemId') itemId: string, @CurrentUser() u: JwtUser) {
    return this.svc.eliminarItem(itemId, u?.sub)
  }

  // ── Presupuestos ──
  @Get()
  listar(@Query('proyectoId') proyectoId: string) { return this.svc.listarPresupuestos(proyectoId) }

  @Post()
  crear(@Body() body: any) { return this.svc.crearPresupuesto(body) }

  /** Árbol completo con parciales/subtotales/totales (la UI repinta en cascada). */
  @Get(':id')
  arbol(@Param('id') id: string) { return this.svc.calcularArbol(id) }

  /** Recálculo explícito: refresca los snapshots desde los APU en vivo y devuelve el árbol. */
  @Post(':id/recalcular')
  recalcular(@Param('id') id: string, @CurrentUser() u: JwtUser) { return this.svc.refrescarSnapshots(id, u?.sub) }

  /** Duplicar Meta → Venta / Línea Base (respeta las reglas de edición por tipo). */
  @Post(':id/duplicar')
  duplicar(@Param('id') id: string, @Body('tipo') tipo: 'venta' | 'linea_base', @Body('nombre') nombre?: string) {
    return this.svc.duplicar(id, tipo, nombre)
  }

  @Post(':id/items')
  crearItem(@Param('id') id: string, @Body() body: any, @CurrentUser() u: JwtUser) {
    return this.svc.crearItem(id, body, u?.sub)
  }
}
