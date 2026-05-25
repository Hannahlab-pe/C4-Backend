import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
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

  @Get(':proyectoId/analisis')
  getAnalisis(@Param('proyectoId') proyectoId: string) {
    return this.chat.getAnalisisDb(proyectoId)
  }

  @Get(':proyectoId/sesion')
  async getSesion(@Param('proyectoId') proyectoId: string, @CurrentUser() user: any) {
    const sesion = await this.chat.getOrCreateSesion(proyectoId, user.id)
    const mensajes = await this.chat.getMensajes(sesion.id)
    return { sesion, mensajes }
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
}
