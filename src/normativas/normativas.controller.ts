import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { NormativasService } from './normativas.service'
import { QueryRagDto } from './dto/query-rag.dto'

@Controller('normativas')
@UseGuards(JwtAuthGuard)
export class NormativasController {
  constructor(private readonly normativasService: NormativasService) {}

  @Get()
  async findAll() {
    return this.normativasService.findAll()
  }

  @Get('distrito/:nombre')
  async findByDistrito(@Param('nombre') nombre: string) {
    const normativa = await this.normativasService.findByDistrito(nombre)
    if (!normativa) throw new BadRequestException(`Distrito "${nombre}" no encontrado`)
    return normativa
  }

  // Endpoint para tool calling del LLM: consultar_normativa(distrito, query)
  @Post('rag/query')
  async queryRag(@Body() dto: QueryRagDto) {
    return this.normativasService.queryRag(dto.query, dto.distrito, dto.limit ?? 5)
  }

  // Trigger manual del seed (útil para resetear datos en dev)
  @Post('seed')
  async seed() {
    await this.normativasService.seedDistritosLima()
    return { ok: true }
  }

  // Ingesta de PDF de normativa municipal
  @Post(':id/ingest-pdf')
  @UseInterceptors(FileInterceptor('file'))
  async ingestPdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo PDF')
    return this.normativasService.ingestPdf(id, file.buffer)
  }
}
