import {
  Controller, Post, Get, Delete, Param, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString } from 'class-validator'
import { KnowledgeBaseService } from './knowledge-base.service'

class IngestDto {
  @IsString() nombre: string
  @IsString() base64: string
}

@Controller('knowledge-base')
@UseGuards(AuthGuard('jwt'))
export class KnowledgeBaseController {
  constructor(private readonly kb: KnowledgeBaseService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.CREATED)
  async ingest(@Body() dto: IngestDto) {
    return this.kb.ingestPdf(dto.nombre, dto.base64)
  }

  @Get('documentos')
  listar() {
    return this.kb.listarDocumentos()
  }

  @Delete('documentos/:nombre')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('nombre') nombre: string) {
    await this.kb.eliminarDocumento(decodeURIComponent(nombre))
  }
}
