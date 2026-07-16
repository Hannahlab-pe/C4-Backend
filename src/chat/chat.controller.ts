import { Body, Controller, Get, Param, Post, Put, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../decorators/current-user.decorator'
import { ChatService } from './chat.service'
import { PdfService } from './pdf.service'
import { StreamChatDto } from './dto/stream-chat.dto'

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chat: ChatService,
    private pdfService: PdfService,
  ) {}

  @Post('stream')
  async stream(
    @Body() dto: StreamChatDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      await this.chat.stream(dto, user, res)
    } catch {
      res.write(`event:error\ndata:${JSON.stringify({ message: 'Error procesando respuesta' })}\n\n`)
    } finally {
      res.end()
    }
  }

  /** Gate: el usuario CONFIRMA la acción de escritura pendiente → se ejecuta y se audita. */
  @Post('confirmar')
  async confirmar(
    @Body() dto: { proyectoId: string },
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    try {
      await this.chat.resolverAccionWeb(dto.proyectoId, user, true, res)
    } catch {
      res.write(`event:error\ndata:${JSON.stringify({ message: 'Error al confirmar la acción' })}\n\n`)
    } finally {
      res.end()
    }
  }

  /** Gate: el usuario CANCELA la acción pendiente → no se ejecuta nada. */
  @Post('cancelar')
  async cancelar(
    @Body() dto: { proyectoId: string },
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    try {
      await this.chat.resolverAccionWeb(dto.proyectoId, user, false, res)
    } catch {
      res.write(`event:error\ndata:${JSON.stringify({ message: 'Error al cancelar la acción' })}\n\n`)
    } finally {
      res.end()
    }
  }

  @Get(':proyectoId/analisis')
  getAnalisis(@Param('proyectoId') proyectoId: string) {
    return this.chat.getAnalisisDb(proyectoId)
  }

  @Post('analizar-fotos')
  analizarFotos(@Body() body: {
    fase?: string; etapaNombre?: string; etapaDescripcion?: string
    imagenes: { nombre?: string; dataUrl: string }[]
  }) {
    return this.chat.analizarFotos(body)
  }

  @Post('analizar-ems')
  analizarEms(@Body() body: { pdfBase64: string; nombre?: string; proyectoId?: string }) {
    return this.chat.analizarEms(body)
  }

  @Post('transcribir')
  transcribir(@Body() body: { audioBase64: string; mimeType?: string }) {
    return this.chat.transcribir(body)
  }

  @Post('voz')
  async voz(@Body() body: { texto: string }, @Res() res: Response) {
    try {
      const audio = await this.chat.tts(body?.texto ?? '')
      res.setHeader('Content-Type', 'audio/mpeg')
      res.send(audio)
    } catch {
      res.status(500).json({ error: 'No se pudo generar la voz' })
    }
  }

  @Put(':proyectoId/cronograma')
  async saveCronograma(@Param('proyectoId') proyectoId: string, @Body() body: any) {
    await this.chat.guardarCronograma(proyectoId, body)
    return { ok: true }
  }

  @Put(':proyectoId/seguimiento')
  async saveSeguimiento(@Param('proyectoId') proyectoId: string, @Body() body: any) {
    await this.chat.guardarSeguimiento(proyectoId, body)
    return { ok: true }
  }

  @Get(':proyectoId/sesion')
  async getSesion(@Param('proyectoId') proyectoId: string, @CurrentUser() user: any) {
    const sesion = await this.chat.getOrCreateSesion(proyectoId, user.id)
    const mensajes = await this.chat.getMensajes(sesion.id)
    return { sesion, mensajes }
  }

  @Get('plano/:proyectoId')
  downloadPlano(@Param('proyectoId') proyectoId: string, @Res() res: Response) {
    const buffer = this.chat.getPlano(proyectoId)
    if (!buffer) {
      res.status(404).json({ error: 'No hay plano para este proyecto' })
      return
    }
    res.setHeader('Content-Type', 'application/dxf')
    res.setHeader('Content-Disposition', `attachment; filename="plano-c4-${proyectoId.slice(0, 8)}.dxf"`)
    res.send(buffer)
  }

  @Get('pdf/:proyectoId')
  async downloadPdf(@Param('proyectoId') proyectoId: string, @Res() res: Response) {
    const datos = this.chat.getAnalisis(proyectoId)
    if (!datos) {
      res.status(404).json({ error: 'No hay análisis para este proyecto' })
      return
    }

    const buffer = await this.pdfService.generarInforme({
      nombre: `Análisis Pre-inversión`,
      distrito: datos.distrito ?? '',
      cabida: datos.cabida,
      estructura: datos.estructura,
      financiero: datos.financiero,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="informe-c4-${proyectoId.slice(0, 8)}.pdf"`)
    res.send(buffer)
  }

  @Get('reporte-obra/:proyectoId')
  async downloadReporteObra(@Param('proyectoId') proyectoId: string, @Res() res: Response) {
    const data = await this.chat.reporteObraData(proyectoId)
    const buffer = await this.pdfService.generarReporteObra(data)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-obra-${proyectoId.slice(0, 8)}.pdf"`)
    res.send(buffer)
  }

  @Get('planos/:proyectoId')
  getPlanos(@Param('proyectoId') proyectoId: string) {
    return this.chat.getPlanosList(proyectoId)
  }

  @Get('plano-archivo/:proyectoId/:filename')
  downloadPlanoArchivo(
    @Param('proyectoId') proyectoId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Sanitize filename to prevent path traversal
    const safe = path.basename(filename)
    const filepath = path.join(process.cwd(), 'storage', 'planos', proyectoId, safe)
    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Plano no encontrado' })
      return
    }
    res.setHeader('Content-Type', 'application/dxf')
    res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
    res.sendFile(filepath)
  }
}
