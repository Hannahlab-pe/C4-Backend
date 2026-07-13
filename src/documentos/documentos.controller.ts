import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { DocumentosService } from './documentos.service'

class SubirDocumentoDto {
  proyectoId: string
  nombre: string
  mimeType: string
  base64: string
}

@Controller('documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private svc: DocumentosService) {}

  @Post()
  async subir(@Body() dto: SubirDocumentoDto) {
    return this.svc.subir(dto)
  }

  @Get('archivo/:id')
  async archivo(@Param('id') id: string) {
    const doc = await this.svc.obtenerArchivo(id)
    return doc ?? { error: 'Archivo no encontrado o sin contenido guardado.' }
  }

  @Get(':proyectoId')
  async listar(@Param('proyectoId') proyectoId: string) {
    return this.svc.listar(proyectoId)
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    await this.svc.eliminar(id)
    return { ok: true }
  }
}
