import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Response } from 'express'
import { Sesion, EstadoSesion } from '../entities/sesion.entity'
import { Mensaje } from '../entities/mensaje.entity'
import { LlmService, LlmMessage, LlmTool, ToolCall, LlmContentPart } from './llm.service'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')
import { MotoresService } from '../motores/motores.service'
import { NormativasService } from '../normativas/normativas.service'
import { PdfService } from './pdf.service'
import { StreamChatDto } from './dto/stream-chat.dto'
import { DocumentosService } from '../documentos/documentos.service'
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service'
import { AnalisisService } from '../analisis/analisis.service'

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el Asistente C4, motor de optimización pre-inversión para constructoras en Lima, Perú.

Tu rol: Dado un terreno, calcular cuánto se puede construir, cómo estructurarlo y cuánto va a rendir financieramente.

FLUJO OBLIGATORIO (sigue este orden siempre):
1. Extrae del usuario: distrito + área del terreno en m². Opcionalmente: frente (m), fondo (m), precio terreno (USD), precio venta objetivo (USD/m²).
2. Llama a consultar_normativa(distrito) para obtener los parámetros urbanísticos oficiales.
3. Con todos los datos, llama a analisis_completo para ejecutar cabida + estructura + financiero.
4. Con los resultados, redacta el informe ejecutivo en el FORMATO indicado.

DATOS MÍNIMOS REQUERIDOS:
- Obligatorio: área del terreno (m²) + distrito de Lima
- Opcionales: frente/fondo (sin ellos se asume proporción 1:1.5 típica de Lima), precio terreno USD, precio venta USD/m²

REGLAS IMPORTANTES:
- NO calcules ni estimes números tú mismo. Todos los valores numéricos los generan los motores.
- Si faltan datos críticos, haz máximo 2 preguntas por turno. Sé directo.
- Cuando tengas área + distrito, ejecuta el flujo completo sin pedir más datos opcionales.
- Responde siempre en español, tono profesional y conciso.

MANEJO DE IMÁGENES Y DOCUMENTOS:
- Si el usuario adjunta una imagen de un edificio, fachada, plano o referencia arquitectónica, analízala como inspiración o referencia de tipología para su proyecto. Describe lo que observas: número aproximado de pisos, tipo de fachada, materiales, tipología (flat, dúplex, loft, etc.), estilo arquitectónico. Usa esa información como contexto para el análisis si el usuario lo solicita.
- Si adjunta planos en PDF, extrae dimensiones, distribución y cualquier dato útil para el análisis.
- NUNCA digas que no puedes analizar una imagen de arquitectura o construcción. Siempre describe lo que ves en términos técnicos de construcción.
- Los archivos son contexto específico de este proyecto — no son para identificación de personas ni lugares públicos, sino para referencia arquitectónica del ingeniero.

FORMATO DEL INFORME EJECUTIVO (usa exactamente esta estructura):

## Análisis de Pre-inversión — [Distrito]

### Cabida Arquitectónica
- Terreno: [área] m² | Planta libre: [planta_libre] m²
- **Pisos de vivienda: [N]** | Sótanos: [N]
- **Área vendible: [X] m²** | Departamentos: [N]
- Estacionamientos requeridos: [N] ([N] en sótano)

*La planta libre resulta de aplicar los retiros normativos de [distrito] (frontal [X]m, lateral [X]m, posterior [X]m) sobre el terreno de [área]m². Se permiten [N] pisos según zonificación [zona] — el factor limitante es [CUS/normativa de pisos]. Con departamentos de ~[X]m² promedio se alcanzan [N] unidades.*

### Predimensionamiento Estructural *(empírico, referencial)*
- Vigas principales: [BxH] cm
- Losa aligerada: h=[X] cm
- Columnas cuadradas: [XxX] cm
- Concreto f'c=210: [X] m³ | Acero fy=4200: [X] ton

*Dimensiones obtenidas por reglas empíricas (peralte ≈ luz/12, columnas por carga acumulada). Para [N] pisos con luces de ~5m se estima [X]m³ de concreto y [X] ton de acero. Valores pre-ETABS, solo para presupuesto referencial.*

### Modelo Financiero
- Inversión total: $[X] USD (terreno + construcción + proyectos + ventas + admin)
- Ingresos proyectados: $[X] USD ([X] m² vendibles × $[precio]/m²)
- **Utilidad neta: $[X] USD — Margen: [X]%**
- **TIR: [X]% anual** | VAN (12%): $[X] USD
- Punto de equilibrio: [N] departamentos | Payback: [N] meses

*El costo de construcción se estima en ~$[X]/m² construido para [distrito]. El precio de venta de $[X]/m² es el promedio de mercado actual en la zona. La TIR se calcula sobre el flujo mensual a [N] meses, descontando preventas al [X]% desde el mes [N]. El punto de equilibrio de [N] deptos cubre costos fijos y financiamiento.*

> *Predimensionamiento referencial (pre-ETABS/SAFE). Financiero basado en promedios de mercado — validar con tasador y estudio de mercado local.*`

// ─── Tool definitions ──────────────────────────────────────────────────────────

const C4_TOOLS: LlmTool[] = [
  {
    type: 'function',
    function: {
      name: 'generar_pdf',
      description:
        'Genera el informe completo de pre-inversión en formato PDF para descargar. Llamar SOLO cuando el usuario pida explícitamente el PDF, el informe descargable o quiera llevarse el análisis.',
      parameters: {
        type: 'object',
        properties: {
          nombre_proyecto: {
            type: 'string',
            description: 'Nombre del proyecto para el encabezado del PDF',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_normativa',
      description:
        'Consulta los parámetros urbanísticos oficiales de un distrito de Lima: zonificación, pisos máximos, retiros (frontal/lateral/posterior), CUS, área mínima de departamento, ratio estacionamientos. Siempre llamar antes de analisis_completo.',
      parameters: {
        type: 'object',
        properties: {
          distrito: {
            type: 'string',
            description:
              'Nombre del distrito de Lima. Ejemplos: Miraflores, San Isidro, Barranco, Santiago de Surco, La Molina, San Borja, Magdalena del Mar, Jesús María, Lince, San Miguel.',
          },
        },
        required: ['distrito'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analisis_completo',
      description:
        'Ejecuta el análisis completo de pre-inversión: cabida arquitectónica + predimensionamiento estructural + modelo financiero. Llamar solo después de tener los parámetros urbanísticos del distrito (vía consultar_normativa).',
      parameters: {
        type: 'object',
        properties: {
          area_total: { type: 'number', description: 'Área total del terreno en m²' },
          frente: {
            type: 'number',
            description: 'Frente del terreno en metros. Omitir si no se conoce.',
          },
          fondo: {
            type: 'number',
            description: 'Fondo del terreno en metros. Omitir si no se conoce.',
          },
          distrito: { type: 'string' },
          pisos_max: { type: 'integer', description: 'Valor obtenido de consultar_normativa' },
          retiro_frontal: { type: 'number' },
          retiro_lateral: { type: 'number' },
          retiro_posterior: { type: 'number' },
          cus: { type: 'number' },
          area_min_depto: { type: 'number' },
          estacionamientos: { type: 'number' },
          precio_terreno_usd: {
            type: 'number',
            description: 'Precio del terreno en USD. Usar 0 si no se conoce.',
          },
          precio_venta_usd_m2: {
            type: 'number',
            description:
              'Precio de venta objetivo en USD/m² vendible. Usar 0 para emplear el promedio del distrito.',
          },
          luz_tipica: {
            type: 'number',
            description: 'Luz libre entre columnas en metros. Default: 5.0',
          },
        },
        required: [
          'area_total',
          'distrito',
          'pisos_max',
          'retiro_frontal',
          'retiro_lateral',
          'retiro_posterior',
          'cus',
          'area_min_depto',
          'estacionamientos',
        ],
      },
    },
  },
]

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  // Almacén en memoria del último análisis por proyecto (para PDF)
  private readonly analisisPorProyecto = new Map<string, any>()

  constructor(
    @InjectRepository(Sesion) private sesionRepo: Repository<Sesion>,
    @InjectRepository(Mensaje) private mensajeRepo: Repository<Mensaje>,
    private llm: LlmService,
    private motores: MotoresService,
    private normativas: NormativasService,
    private pdfService: PdfService,
    private documentos: DocumentosService,
    private kb: KnowledgeBaseService,
    private analisisService: AnalisisService,
  ) {}

  getAnalisis(proyectoId: string): any | undefined {
    return this.analisisPorProyecto.get(proyectoId)
  }

  getAnalisisDb(proyectoId: string) {
    return this.analisisService.getByProyecto(proyectoId)
  }

  async getOrCreateSesion(proyectoId: string, userId: string): Promise<Sesion> {
    const existing = await this.sesionRepo.findOne({
      where: { proyectoId, usuarioId: userId, estado: EstadoSesion.ACTIVA },
    })
    if (existing) return existing
    return this.sesionRepo.save(
      this.sesionRepo.create({ proyectoId, usuarioId: userId, estado: EstadoSesion.ACTIVA }),
    )
  }

  async getMensajes(sesionId: string): Promise<Mensaje[]> {
    return this.mensajeRepo.find({
      where: { sesionId },
      order: { createdAt: 'ASC' },
    })
  }

  async stream(dto: StreamChatDto, user: any, res: Response): Promise<void> {
    const sesion = await this.getOrCreateSesion(dto.proyectoId, user.id)

    await this.mensajeRepo.save(
      this.mensajeRepo.create({ sesionId: sesion.id, rol: 'user', contenido: dto.mensaje }),
    )

    const history = await this.mensajeRepo.find({
      where: { sesionId: sesion.id },
      order: { createdAt: 'ASC' },
      take: 20,
    })

    // Contexto de documentos persistidos del proyecto
    const contextoDocumentos = await this.documentos.getContextoParaLlm(dto.proyectoId)
    const imagenesProyecto = await this.documentos.getImagenesParaLlm(dto.proyectoId)

    // Buscar en base de conocimiento corporativa (Betondecken PDFs)
    let contextoKb = ''
    try {
      res.write(`event:status\ndata:${JSON.stringify({ step: 'Consultando base de conocimiento...', icon: 'search' })}\n\n`)
      const kbResults = await this.kb.search(dto.mensaje, 5)
      this.logger.log(`KB search "${dto.mensaje.slice(0, 50)}": ${kbResults.length} resultados, similitudes: ${kbResults.map(r => r.similarity).join(', ')}`)
      if (kbResults.length > 0) {
        const chunks = kbResults
          .filter((r) => r.similarity > 0.1)
          .map((r) => `[${r.documento_nombre}]\n${r.contenido}`)
          .join('\n\n---\n\n')
        if (chunks) {
          contextoKb = `\n\n---\n## Base de Conocimiento Corporativa (documentos internos de la empresa)\nUSA ESTA INFORMACIÓN PRIMERO antes de responder. Si la pregunta está relacionada con estos documentos, responde basándote EXCLUSIVAMENTE en este contenido:\n\n${chunks}`
        }
      }
    } catch (err: any) {
      this.logger.warn(`KB search error: ${err?.message}`)
    }

    // Construir el último mensaje del usuario — puede incluir archivo adjunto puntual
    const lastUserContent = await this.buildUserContent(dto)

    // System prompt enriquecido con documentos del proyecto + KB corporativa
    const systemPrompt = SYSTEM_PROMPT + contextoDocumentos + contextoKb

    // Mensajes del historial previo
    const historialMsgs: LlmMessage[] = history.slice(0, -1).map((m) => ({
      role: m.rol === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.contenido,
    }))

    // Si hay imágenes de proyecto guardadas, las inyectamos como contexto visual
    const imagenesMsgs: LlmMessage[] = imagenesProyecto.length > 0 ? [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Imágenes de referencia del proyecto (${imagenesProyecto.length} adjuntas):` },
          ...imagenesProyecto.map((img) => ({
            type: 'image_url' as const,
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          })),
        ],
      },
      { role: 'assistant', content: 'He revisado las imágenes del proyecto. Puedo referenciarlas en mi análisis.' },
    ] : []

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...imagenesMsgs,
      ...historialMsgs,
      { role: 'user', content: lastUserContent },
    ]

    let finalText: string

    if (this.llm.isAgenticProvider()) {
      finalText = await this.runAgenticLoop(messages, res, dto.proyectoId)
    } else {
      finalText = await this.llm.streamChat(messages, res)
    }

    if (finalText) {
      await this.mensajeRepo.save(
        this.mensajeRepo.create({ sesionId: sesion.id, rol: 'assistant', contenido: finalText }),
      )
    }

    res.write(`event:done\ndata:{}\n\n`)
  }

  // ─── Construcción de contenido de usuario con archivo ────────────────────────

  private async buildUserContent(dto: StreamChatDto): Promise<string | LlmContentPart[]> {
    if (!dto.archivoBase64 || !dto.archivoTipo) return dto.mensaje

    const tipo = dto.archivoTipo.toLowerCase()

    // Imagen → visión GPT-4o
    if (tipo.startsWith('image/')) {
      const dataUrl = `data:${dto.archivoTipo};base64,${dto.archivoBase64}`
      return [
        { type: 'text', text: dto.mensaje },
        { type: 'image_url', image_url: { url: dataUrl } },
      ]
    }

    // PDF → extraer texto e inyectar como contexto
    if (tipo === 'application/pdf') {
      try {
        const buffer = Buffer.from(dto.archivoBase64, 'base64')
        const parsed = await pdfParse(buffer)
        const texto = parsed.text?.slice(0, 8000) ?? '' // máx 8k chars para no saturar el contexto
        return `${dto.mensaje}\n\n---\n**Archivo adjunto: ${dto.archivoNombre ?? 'documento.pdf'}**\n\`\`\`\n${texto}\n\`\`\``
      } catch (err: any) {
        this.logger.error('Error extrayendo texto de PDF:', err?.message)
        return dto.mensaje
      }
    }

    return dto.mensaje
  }

  // ─── Agentic loop ────────────────────────────────────────────────────────────

  private async runAgenticLoop(messages: LlmMessage[], res: Response, proyectoId: string): Promise<string> {
    const MAX_ITERATIONS = 6

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const result = await this.llm.completWithTools(messages, C4_TOOLS)

      if (!result.tool_calls || result.tool_calls.length === 0) {
        res.write(`event:status\ndata:${JSON.stringify({ step: 'Redactando informe...', done: true })}\n\n`)
        const text = result.content ?? ''
        await this.llm.streamText(text, res)
        return text
      }

      messages.push({
        role: 'assistant',
        content: result.content,
        tool_calls: result.tool_calls,
      })

      for (const tc of result.tool_calls) {
        const toolResult = await this.executeTool(tc, res, proyectoId)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        })
      }
    }

    const fallback = 'No pude completar el análisis. Por favor verifica los datos del terreno e inténtalo de nuevo.'
    await this.llm.streamText(fallback, res)
    return fallback
  }

  private async executeTool(tc: ToolCall, res: Response, proyectoId: string): Promise<any> {
    const name = tc.function.name
    let args: Record<string, any>

    try {
      args = JSON.parse(tc.function.arguments)
    } catch {
      return { error: `Argumentos inválidos para ${name}` }
    }

    if (name === 'consultar_normativa') return this.toolConsultarNormativa(args.distrito, res)
    if (name === 'analisis_completo') return this.toolAnalisisCompleto(args, res, proyectoId)
    if (name === 'generar_pdf') return this.toolGenerarPdf(args, res, proyectoId)

    return { error: `Tool desconocida: ${name}` }
  }

  private async toolConsultarNormativa(distrito: string, res: Response): Promise<any> {
    res.write(
      `event:status\ndata:${JSON.stringify({ step: `Consultando normativa de ${distrito}...` })}\n\n`,
    )

    const normativa = await this.normativas.findByDistrito(distrito)
    if (!normativa) {
      return {
        error: `Distrito "${distrito}" no encontrado. Distritos disponibles: Miraflores, San Isidro, Santiago de Surco, La Molina, San Borja, Magdalena del Mar, Jesús María, Lince, San Miguel, Barranco.`,
      }
    }

    return {
      distrito: normativa.distrito,
      zonificacion: normativa.zonificacion,
      pisos_max: normativa.pisosMax,
      retiro_frontal: Number(normativa.retiroFrontal),
      retiro_lateral: Number(normativa.retiroLateral),
      retiro_posterior: Number(normativa.retiroPosterior),
      cus: Number(normativa.cus),
      area_min_depto: Number(normativa.areaMinDepto),
      estacionamientos: Number(normativa.estacionamientos),
      fuente: normativa.fuente,
    }
  }

  private async toolAnalisisCompleto(args: Record<string, any>, res: Response, proyectoId: string): Promise<any> {
    const pythonOk = await this.motores.healthCheck()
    if (!pythonOk) {
      return { error: 'Motor Python no disponible. Asegúrate de que el servidor FastAPI esté corriendo.' }
    }

    const terreno = { area_total: args.area_total, frente: args.frente ?? null, fondo: args.fondo ?? null }
    const normativa = {
      distrito: args.distrito,
      pisos_max: args.pisos_max,
      retiro_frontal: args.retiro_frontal,
      retiro_lateral: args.retiro_lateral,
      retiro_posterior: args.retiro_posterior,
      cus: args.cus,
      area_min_depto: args.area_min_depto,
      estacionamientos: args.estacionamientos,
    }

    try {
      // ── Paso 1: Cabida ──────────────────────────────────────────────────────
      res.write(`event:status\ndata:${JSON.stringify({ step: 'Calculando cabida arquitectónica...', icon: 'layers' })}\n\n`)
      const cabida = await this.motores.cabida({ terreno, normativa })

      // ── Paso 2: Estructura ─────────────────────────────────────────────────
      res.write(`event:status\ndata:${JSON.stringify({ step: 'Predimensionando estructura...', icon: 'building' })}\n\n`)
      const estructura = await this.motores.estructural({
        area_piso: cabida.planta_libre,
        num_pisos: cabida.pisos_vivienda,
        luz_tipica: args.luz_tipica ?? 5.0,
      })

      // ── Paso 3: Financiero ─────────────────────────────────────────────────
      res.write(`event:status\ndata:${JSON.stringify({ step: 'Modelando TIR y flujo de caja...', icon: 'chart' })}\n\n`)
      const financiero = await this.motores.financiero({
        distrito: args.distrito,
        area_vendible_m2: cabida.area_vendible_total,
        area_construida_m2: cabida.area_construida_bruta,
        num_departamentos: cabida.num_departamentos,
        precio_terreno_usd: args.precio_terreno_usd ?? 0,
        precio_venta_usd_m2: args.precio_venta_usd_m2 ?? 0,
      })

      const resultado = { cabida, estructura, financiero }

      // Guardar en memoria (para PDF) + persistir en DB
      this.analisisPorProyecto.set(proyectoId, { ...resultado, distrito: args.distrito })
      this.analisisService.guardar(proyectoId, args.distrito, cabida, estructura, financiero).catch(() => {})
      res.write(`event:analisis_update\ndata:${JSON.stringify(resultado)}\n\n`)

      return resultado
    } catch (err: any) {
      this.logger.error('Error en toolAnalisisCompleto:', err?.message)
      return { error: `Error en análisis: ${err?.message ?? 'desconocido'}` }
    }
  }

  private async toolGenerarPdf(args: Record<string, any>, res: Response, proyectoId: string): Promise<any> {
    res.write(`event:status\ndata:${JSON.stringify({ step: 'Generando PDF...', icon: 'pdf' })}\n\n`)

    const datos = this.analisisPorProyecto.get(proyectoId)
    if (!datos) {
      return { error: 'No hay análisis previo para este proyecto. Primero ejecuta el análisis de cabida.' }
    }

    try {
      await this.pdfService.generarInforme({
        nombre: args.nombre_proyecto ?? 'Proyecto C4',
        distrito: datos.distrito ?? '',
        cabida: datos.cabida,
        estructura: datos.estructura,
        financiero: datos.financiero,
      })

      // Emite la URL de descarga al frontend
      res.write(`event:pdf_ready\ndata:${JSON.stringify({ url: `/api/chat/pdf/${proyectoId}` })}\n\n`)

      return { ok: true, mensaje: 'PDF generado. El usuario puede descargarlo desde el botón que aparecerá en la interfaz.' }
    } catch (err: any) {
      this.logger.error('Error generando PDF:', err?.message)
      return { error: `Error al generar PDF: ${err?.message}` }
    }
  }
}
