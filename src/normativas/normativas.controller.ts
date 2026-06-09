import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../decorators/current-user.decorator'
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

  @Post()
  async create(@Body() body: any, @CurrentUser() user: any) {
    if (user?.rol !== 'admin') throw new ForbiddenException('Solo administradores')
    return this.normativasService.create(body)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    if (user?.rol !== 'admin') throw new ForbiddenException('Solo administradores')
    return this.normativasService.update(id, body)
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.rol !== 'admin') throw new ForbiddenException('Solo administradores')
    await this.normativasService.remove(id)
    return { ok: true }
  }

  @Post('rag/query')
  async queryRag(@Body() dto: QueryRagDto) {
    return this.normativasService.queryRag(dto.query, dto.distrito, dto.limit ?? 5)
  }

  @Post('seed')
  async seed(@CurrentUser() user: any) {
    if (user?.rol !== 'admin') throw new ForbiddenException('Solo administradores')
    await this.normativasService.seedDistritosLima()
    return { ok: true }
  }

  @Post(':id/ingest-pdf')
  @UseInterceptors(FileInterceptor('file'))
  async ingestPdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (user?.rol !== 'admin') throw new ForbiddenException('Solo administradores')
    if (!file) throw new BadRequestException('Se requiere un archivo PDF')
    return this.normativasService.ingestPdf(id, file.buffer)
  }
}
