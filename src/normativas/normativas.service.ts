import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike } from 'typeorm'
import { Normativa } from '../entities/normativa.entity'
import { RagService } from './rag.service'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

// Parámetros urbanísticos representativos de los 10 distritos principales de Lima
// Fuente: PDUs y Ordenanzas Municipales vigentes 2024-2025
const LIMA_NORMATIVAS = [
  {
    distrito: 'Miraflores',
    ubigeo: '150122',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 12,
    retiroFrontal: 3.0,
    retiroLateral: 0.0,
    retiroPosterior: 3.0,
    cus: 7.0,
    areaMinDepto: 45,
    estacionamientos: 1,
    fuente: 'Ordenanza N°342-MM y Ordenanza N°394-MM',
  },
  {
    distrito: 'San Isidro',
    ubigeo: '150131',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 15,
    retiroFrontal: 5.0,
    retiroLateral: 3.0,
    retiroPosterior: 3.0,
    cus: 8.0,
    areaMinDepto: 60,
    estacionamientos: 2,
    fuente: 'PDU San Isidro y Ordenanzas Municipales',
  },
  {
    distrito: 'Santiago de Surco',
    ubigeo: '150140',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 8,
    retiroFrontal: 3.0,
    retiroLateral: 2.0,
    retiroPosterior: 3.0,
    cus: 4.5,
    areaMinDepto: 45,
    estacionamientos: 1,
    fuente: 'Ordenanza N°459-MSS',
  },
  {
    distrito: 'La Molina',
    ubigeo: '150113',
    zonificacion: 'RDM - Residencial de Densidad Media',
    pisosMax: 5,
    retiroFrontal: 5.0,
    retiroLateral: 3.0,
    retiroPosterior: 3.0,
    cus: 2.8,
    areaMinDepto: 80,
    estacionamientos: 2,
    fuente: 'PDU La Molina y Ordenanzas Municipales',
  },
  {
    distrito: 'San Borja',
    ubigeo: '150130',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 10,
    retiroFrontal: 3.0,
    retiroLateral: 2.0,
    retiroPosterior: 3.0,
    cus: 5.5,
    areaMinDepto: 45,
    estacionamientos: 1,
    fuente: 'PDU San Borja y Ordenanzas Municipales',
  },
  {
    distrito: 'Magdalena del Mar',
    ubigeo: '150119',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 8,
    retiroFrontal: 3.0,
    retiroLateral: 2.0,
    retiroPosterior: 3.0,
    cus: 4.0,
    areaMinDepto: 40,
    estacionamientos: 1,
    fuente: 'Ordenanzas Municipalidad de Magdalena del Mar',
  },
  {
    distrito: 'Jesús María',
    ubigeo: '150111',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 10,
    retiroFrontal: 3.0,
    retiroLateral: 0.0,
    retiroPosterior: 3.0,
    cus: 5.0,
    areaMinDepto: 40,
    estacionamientos: 1,
    fuente: 'PDU Jesús María y Ordenanzas Municipales',
  },
  {
    distrito: 'Lince',
    ubigeo: '150114',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 10,
    retiroFrontal: 3.0,
    retiroLateral: 0.0,
    retiroPosterior: 3.0,
    cus: 5.5,
    areaMinDepto: 40,
    estacionamientos: 1,
    fuente: 'Ordenanzas Municipalidad de Lince',
  },
  {
    distrito: 'San Miguel',
    ubigeo: '150132',
    zonificacion: 'RDA - Residencial de Densidad Alta',
    pisosMax: 8,
    retiroFrontal: 3.0,
    retiroLateral: 2.0,
    retiroPosterior: 3.0,
    cus: 4.5,
    areaMinDepto: 40,
    estacionamientos: 1,
    fuente: 'PDU San Miguel y Ordenanzas Municipales',
  },
  {
    distrito: 'Barranco',
    ubigeo: '150104',
    zonificacion: 'RDM - Residencial de Densidad Media / ZRE-H (Zona Patrimonio)',
    pisosMax: 7,
    retiroFrontal: 3.0,
    retiroLateral: 2.0,
    retiroPosterior: 3.0,
    cus: 3.5,
    areaMinDepto: 45,
    estacionamientos: 1,
    fuente: 'Ordenanzas Municipalidad de Barranco / Ministerio de Cultura',
  },
]

@Injectable()
export class NormativasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NormativasService.name)

  constructor(
    @InjectRepository(Normativa)
    private readonly normativaRepo: Repository<Normativa>,
    private readonly ragService: RagService,
  ) {}

  async onApplicationBootstrap() {
    // Pequeño delay para que RagService (OnModuleInit) termine primero
    setTimeout(() => this.seedDistritosLima(), 2000)
  }

  async seedDistritosLima(): Promise<void> {
    await this.ragService.cleanupNullEmbeddings()

    for (const data of LIMA_NORMATIVAS) {
      let normativa = await this.normativaRepo.findOne({ where: { distrito: data.distrito } })

      if (!normativa) {
        normativa = await this.normativaRepo.save(data)
        this.logger.log(`Normativa creada: ${normativa.distrito}`)
      } else {
        // Upsert: actualizar valores si el seed cambió
        Object.assign(normativa, data)
        normativa = await this.normativaRepo.save(normativa)
        this.logger.log(`Normativa actualizada: ${normativa.distrito}`)
      }

      // Regenerar embedding (siempre al arrancar para que refleje cambios)
      await this.ragService.deleteEmbeddingsByNormativa(normativa.id)
      const texto = this.normativaToText(normativa)
      try {
        await this.ragService.insertEmbedding(normativa.id, texto, {
          distrito: normativa.distrito,
          tipo: 'parametros_urbanisticos',
        })
        this.logger.log(`Embedding generado: ${normativa.distrito}`)
      } catch (err: any) {
        this.logger.warn(`Error embedding ${normativa.distrito}: ${err?.message}`)
      }
    }
  }

  async create(data: Partial<Normativa>): Promise<Normativa> {
    const normativa = await this.normativaRepo.save(this.normativaRepo.create(data))
    await this.refreshEmbedding(normativa)
    return normativa
  }

  async update(id: string, data: Partial<Normativa>): Promise<Normativa> {
    const normativa = await this.normativaRepo.findOneOrFail({ where: { id } })
    Object.assign(normativa, data)
    const saved = await this.normativaRepo.save(normativa)
    await this.refreshEmbedding(saved)
    return saved
  }

  async remove(id: string): Promise<void> {
    await this.ragService.deleteEmbeddingsByNormativa(id)
    await this.normativaRepo.delete(id)
  }

  private async refreshEmbedding(normativa: Normativa): Promise<void> {
    await this.ragService.deleteEmbeddingsByNormativa(normativa.id)
    const texto = this.normativaToText(normativa)
    try {
      await this.ragService.insertEmbedding(normativa.id, texto, {
        distrito: normativa.distrito,
        tipo: 'parametros_urbanisticos',
      })
    } catch (err) {
      this.logger.warn(`Error embedding ${normativa.distrito}: ${err.message}`)
    }
  }

  normativaToText(n: Normativa): string {
    const partes = [
      `Parámetros urbanísticos del distrito de ${n.distrito}, Lima, Perú.`,
      `Zonificación: ${n.zonificacion}.`,
      `Altura máxima permitida: ${n.pisosMax} pisos.`,
    ]
    if (n.retiroFrontal > 0) partes.push(`Retiro frontal: ${n.retiroFrontal} metros.`)
    if (n.retiroLateral > 0) partes.push(`Retiro lateral: ${n.retiroLateral} metros.`)
    if (n.retiroPosterior > 0) partes.push(`Retiro posterior: ${n.retiroPosterior} metros.`)
    if (n.cus) partes.push(`Coeficiente de Uso del Suelo (CUS): ${n.cus}.`)
    if (n.areaMinDepto) partes.push(`Área mínima de departamento: ${n.areaMinDepto} m².`)
    if (n.estacionamientos) partes.push(`Estacionamientos requeridos: ${n.estacionamientos} por unidad de vivienda.`)
    if (n.fuente) partes.push(`Fuente normativa: ${n.fuente}.`)
    return partes.join(' ')
  }

  async findAll(): Promise<Normativa[]> {
    return this.normativaRepo.find({ order: { distrito: 'ASC' } })
  }

  async findByDistrito(nombre: string): Promise<Normativa | null> {
    return this.normativaRepo.findOne({ where: { distrito: ILike(`%${nombre}%`) } })
  }

  async queryRag(query: string, distrito?: string, limit = 5) {
    const normativa = distrito ? await this.findByDistrito(distrito) : null
    const chunks = await this.ragService.search(query, distrito, limit)
    return { normativa, chunks }
  }

  async ingestPdf(normativaId: string, buffer: Buffer): Promise<{ chunks: number }> {
    const { text } = await pdfParse(buffer)
    const chunks = this.chunkText(text, 500, 100)
    for (const chunk of chunks) {
      await this.ragService.insertEmbedding(normativaId, chunk, {
        tipo: 'pdf',
        normativaId,
      })
    }
    return { chunks: chunks.length }
  }

  private chunkText(text: string, size: number, overlap: number): string[] {
    const clean = text.replace(/\s+/g, ' ').trim()
    const chunks: string[] = []
    let i = 0
    while (i < clean.length) {
      const chunk = clean.slice(i, i + size).trim()
      if (chunk.length > 50) chunks.push(chunk)
      i += size - overlap
    }
    return chunks
  }
}
