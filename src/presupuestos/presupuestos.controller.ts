import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards, HttpCode, Res, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import type { Response } from 'express'
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

  // ── Import desde Excel: paso 1-2 (parseo + preview con matching, no escribe nada) ──
  @Post('import/preview')
  @UseInterceptors(FileInterceptor('archivo'))
  previewImport(@UploadedFile() archivo: { buffer: Buffer }) {
    if (!archivo?.buffer) return { error: 'No se recibió el archivo Excel.' }
    return this.svc.previewImport(archivo.buffer)
  }

  /** Import paso 4: crea el presupuesto nuevo desde las filas confirmadas por el usuario. */
  @Post('import/confirmar')
  confirmarImport(@Body() body: any, @CurrentUser() u: JwtUser) {
    return this.svc.confirmarImport(body, u?.sub)
  }

  // ── Presupuestos ──
  @Get()
  listar(@Query('proyectoId') proyectoId: string) { return this.svc.listarPresupuestos(proyectoId) }

  @Post()
  crear(@Body() body: any) { return this.svc.crearPresupuesto(body) }

  /** Árbol completo con parciales/subtotales/totales (la UI repinta en cascada). */
  @Get(':id')
  arbol(@Param('id') id: string) { return this.svc.calcularArbol(id) }

  /** Exporta el presupuesto a Excel (Hoja Resumen, snapshots exactos). */
  @Get(':id/export')
  async exportar(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.svc.exportarExcel(id)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.send(buffer)
  }

  /** Recálculo explícito: refresca los snapshots desde los APU en vivo y devuelve el árbol. */
  @Post(':id/recalcular')
  recalcular(@Param('id') id: string, @CurrentUser() u: JwtUser) { return this.svc.refrescarSnapshots(id, u?.sub) }

  /** Condiciones de cobro del contrato: % de adelanto amortizable + % de fondo de garantía. */
  @Patch(':id/deducciones')
  actualizarDeducciones(@Param('id') id: string, @Body() body: { adelantoPct?: number; fondoGarantiaPct?: number }, @CurrentUser() u: JwtUser) {
    return this.svc.actualizarDeducciones(id, body, u?.sub)
  }

  /** Duplicar Meta → Venta / Línea Base (respeta las reglas de edición por tipo). */
  @Post(':id/duplicar')
  duplicar(@Param('id') id: string, @Body('tipo') tipo: 'venta' | 'linea_base', @Body('nombre') nombre?: string) {
    return this.svc.duplicar(id, tipo, nombre)
  }

  @Post(':id/items')
  crearItem(@Param('id') id: string, @Body() body: any, @CurrentUser() u: JwtUser) {
    return this.svc.crearItem(id, body, u?.sub)
  }

  /** Agrega una partida desde la biblioteca WBS (partidas_catalogo) con P.U. manual. */
  @Post(':id/items-catalogo')
  agregarDesdeCatalogo(@Param('id') id: string, @Body() body: any, @CurrentUser() u: JwtUser) {
    return this.svc.agregarDesdeCatalogo(id, body, u?.sub)
  }

  // ── Valorizaciones (avance mensual para cobrar) ──
  @Get(':id/valorizaciones')
  listarValorizaciones(@Param('id') id: string) { return this.svc.listarValorizaciones(id) }

  @Post(':id/valorizaciones')
  crearValorizacion(@Param('id') id: string, @Body('periodo') periodo: string, @CurrentUser() u: JwtUser) {
    return this.svc.crearValorizacion(id, periodo, u?.sub)
  }

  @Get('valorizaciones/:valId')
  getValorizacion(@Param('valId') valId: string) { return this.svc.getValorizacion(valId) }

  @Patch('valorizaciones/:valId/avance')
  actualizarAvance(@Param('valId') valId: string, @Body() body: { itemId: string; pct: number }, @CurrentUser() u: JwtUser) {
    return this.svc.actualizarAvance(valId, body?.itemId, body?.pct, u?.sub)
  }

  @Delete('valorizaciones/:valId')
  @HttpCode(200)
  eliminarValorizacion(@Param('valId') valId: string, @CurrentUser() u: JwtUser) {
    return this.svc.eliminarValorizacion(valId, u?.sub)
  }
}
