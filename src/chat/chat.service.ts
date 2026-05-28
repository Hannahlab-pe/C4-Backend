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

const SYSTEM_PROMPT = `Eres el Asistente C4, motor de pre-inversión para constructoras en Lima, Perú.

════════════════════════════════════════════
FUENTES DE CONOCIMIENTO — REGLA FUNDAMENTAL
════════════════════════════════════════════

Solo puedes responder usando estas fuentes, en orden de prioridad:

1. CONVERSACIÓN: datos que el usuario mencionó en este chat (área, precio, dirección, preferencias)
2. BASE DE CONOCIMIENTO (KB): documentos subidos por la empresa — buscar_en_base_de_conocimiento
3. NORMATIVAS: parámetros urbanísticos del distrito — consultar_normativa
4. MOTORES: resultados de cabida, estructura y financiero — analisis_completo

PROHIBIDO usar tu conocimiento de entrenamiento para responder preguntas técnicas, normativas, de procedimientos, precios o especificaciones. Si la respuesta no está en alguna de las 4 fuentes anteriores, di exactamente:
"No encontré esa información en los documentos disponibles. Si tienes la norma o manual correspondiente, puedes subirlo al proyecto."

CÓMO COMBINAR FUENTES:
Puedes y debes cruzar datos de varias fuentes en la misma respuesta. Cita siempre el origen de cada dato:
- "Según [nombre del documento KB]..." → dato de la base de conocimiento
- "El usuario indicó que..." → dato de la conversación
- "Según la normativa de [distrito]..." → dato de consultar_normativa
- "El motor calcula..." → dato de los motores Python
Ejemplo: "El usuario indicó un precio de terreno de $900k. Según la normativa de Miraflores, aplican 12 pisos máx. El motor calcula una TIR de 24%."

════════════════════════════════════════════
MODO DE OPERACIÓN
════════════════════════════════════════════

A) CONVERSACIÓN NORMAL: Saludos, preguntas técnicas, comentarios sobre análisis ya realizado → responde con las fuentes disponibles, sin re-ejecutar análisis.

B) ENTREVISTA DE PRE-INVERSIÓN: Cuando el usuario menciona que tiene un terreno → conduce la entrevista guiada y ejecuta el análisis al final.

Regla clave: si ya hay un análisis en el historial y el usuario solo pregunta sobre él, usa modo A.

════════════════════════════════════════════
FLUJO DE ENTREVISTA GUIADA (Modo B)
════════════════════════════════════════════

Máximo 2 preguntas por turno. Sé conversacional.

PASO 1 — UBICACIÓN (obligatorio)
Dirección exacta o distrito. Determina normativa y precios de mercado.

PASO 2 — DIMENSIONES (obligatorio)
Área total en m² y frente en metros. El frente es CRÍTICO: 400m² con 8m de frente tiene mucho menos potencial que con 20m porque los retiros afectan la planta libre de forma distinta. También pregunta si hay demolición.

PASO 3 — TIPOLOGÍA Y USO
Uso previsto (multifamiliar, oficinas, comercial, mixto). Si es multifamiliar: mezcla de departamentos (studios, 1 dorm, 2 dorm, 3 dorm) y sus precios objetivo por m² — afecta el ingreso ponderado total.

PASO 4 — DATOS ECONÓMICOS
a) Precio del terreno en USD
b) Precio de venta en USD/m² (o usa promedio del distrito)
c) Capital propio vs financiamiento bancario (default: 60% propio / 40% banco al 11%)

════════════════════════════════════════════
BASE DE CONOCIMIENTO — USO OBLIGATORIO
════════════════════════════════════════════

Para cualquier pregunta técnica, normativa, de procedimientos, precios o especificaciones: llama PRIMERO a buscar_en_base_de_conocimiento. No respondas antes de buscar.

Queries útiles:
- "parámetros urbanísticos [dirección]" — para normativa específica de ubicación
- "normativa [distrito] pisos zonificación" — para análisis de terreno
- "[tema específico]" — para preguntas técnicas del usuario

RESULTADO DE LA BÚSQUEDA:
- Encontró resultados relevantes → responde citando el documento: "Según [nombre del documento]..."
- No encontró resultados → responde: "No encontré esa información en los documentos disponibles." NO uses tu conocimiento de entrenamiento para completar la respuesta.
- El usuario hace seguimiento ("¿y luego?", "¿qué más dice?") → formula una nueva búsqueda específica antes de responder.

════════════════════════════════════════════
CUÁNDO EJECUTAR EL ANÁLISIS
════════════════════════════════════════════

Ejecuta solo cuando tengas: área m² + distrito.
Flujo:
1. buscar_en_base_de_conocimiento("parámetros urbanísticos [ubicación]")
2. consultar_normativa(distrito)
3. analisis_completo(...) con todos los parámetros recopilados
4. Informe ejecutivo en el formato indicado

NO recalcules si el usuario ya tiene un análisis y solo comenta sobre él.
NO calcules números tú mismo — los motores generan todos los valores.

════════════════════════════════════════════
IMÁGENES Y DOCUMENTOS ADJUNTOS
════════════════════════════════════════════

- Imágenes de edificios/fachadas/planos: analiza visualmente como referencia técnica. Describe pisos, tipología, materiales, estilo. Esto es observación directa, no conocimiento de entrenamiento.
- PDFs de planos: extrae dimensiones y datos concretos del documento.
- Nunca digas que no puedes analizar una imagen de arquitectura o construcción.

════════════════════════════════════════════
FORMATO DEL INFORME EJECUTIVO
════════════════════════════════════════════

## Análisis de Pre-inversión — [Distrito]

> [Fuente: "Normativa interna — [documento KB]" O "Normativa general de [distrito] (sin datos específicos en base de conocimiento)"]

### Cabida Arquitectónica
- Terreno: [área] m² · Frente: [X]m · Fondo: [X]m
- Planta libre: [X] m² (tras retiros: frontal [X]m, lateral [X]m, posterior [X]m)
- **Pisos de vivienda: [N]** | Sótanos: [N] | Factor limitante: [CUS/pisos normativa]
- **Área vendible: [X] m²** · Departamentos: [N] · Ratio ocupación: [cus_utilizado]x
- Estacionamientos: [N] requeridos ([N] en sótano)

### Predimensionamiento Estructural *(empírico, pre-ETABS)*
- Vigas: [BxH] cm · Losa: h=[X] cm · Columnas: [XxX] cm
- Materiales referenciales: Concreto f'c=210 → [X] m³ | Acero fy=4200 → [X] ton

### Modelo Financiero *(horizonte [N] meses: [N] preobra + [N] obra + [N] postentrega)*

**Estructura de costos:**
| Rubro | Monto |
|-------|-------|
| Terreno | $[X] |
| Alcabala + notaría | $[X] |
| [Demolición | $[X] — solo si aplica] |
| Licencias + diseño (6%) | $[X] |
| Construcción ($[X]/m²) | $[X] |
| Supervisión + gerencia (5%) | $[X] |
| Imprevistos (3%) | $[X] |
| Marketing + corretaje (5%) | $[X] |
| Titulación SUNARP (1.5%) | $[X] |
| **Intereses bancarios** | $[X] |
| **TOTAL INVERSIÓN** | **$[X]** |

**Resultados:**
- Ingresos: $[X] ([X] m² × $[precio]/m²) · Velocidad de ventas: ~[X] deptos/mes
- **Utilidad neta: $[X] — Margen: [X]%** (después de impuestos ~15%)
- **TIR del inversor: [X]% anual** | VAN al 12%: $[X]
- Punto de equilibrio: [N] deptos | Payback: mes [N]
- Financiamiento: [X]% capital propio · $[X] USD prestado al [X]% anual

*Costos de construcción referenciados al mercado de [distrito] 2026. Velocidad de ventas: promedio histórico del distrito. TIR calculada sobre flujo de equity (capital propio del inversor). Validar con estudio de mercado, tasador certificado y estructura financiera definitiva.*`

// ─── Tool definitions ──────────────────────────────────────────────────────────

const C4_TOOLS: LlmTool[] = [
  {
    type: 'function',
    function: {
      name: 'buscar_en_base_de_conocimiento',
      description:
        'Busca en los documentos internos de la empresa: manuales técnicos, procedimientos de obra, cotizaciones, normativas específicas, estudios de suelo, fichas de materiales, etc. Usar cuando el usuario pregunta algo técnico específico que podría estar documentado internamente. No usar para preguntas generales de conversación.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Pregunta o tema específico a buscar. Sé preciso para obtener mejores resultados. Ejemplo: "precio acero corrugado", "procedimiento calzadura tipo Berlín", "resistencia concreto premezclado".',
          },
        },
        required: ['query'],
      },
    },
  },
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
        'Ejecuta el análisis completo de pre-inversión: cabida arquitectónica + predimensionamiento estructural + modelo financiero con flujo de caja realista. Llamar solo después de consultar_normativa.',
      parameters: {
        type: 'object',
        properties: {
          area_total: { type: 'number', description: 'Área total del terreno en m²' },
          frente: { type: 'number', description: 'Frente del terreno en metros. Importante para el cálculo de planta libre. Omitir solo si el usuario no lo conoce.' },
          fondo: { type: 'number', description: 'Fondo del terreno en metros. Omitir si no se conoce.' },
          distrito: { type: 'string' },
          pisos_max: { type: 'integer', description: 'De consultar_normativa' },
          retiro_frontal: { type: 'number' },
          retiro_lateral: { type: 'number' },
          retiro_posterior: { type: 'number' },
          cus: { type: 'number' },
          area_min_depto: { type: 'number' },
          estacionamientos: { type: 'number' },
          precio_terreno_usd: { type: 'number', description: 'Precio del terreno en USD. 0 = estimar por el motor.' },
          precio_venta_usd_m2: { type: 'number', description: 'Precio de venta USD/m². 0 = promedio del distrito.' },
          area_demolicion_m2: { type: 'number', description: 'Área a demoler en m². 0 si el terreno está limpio.' },
          porcentaje_capital_propio: { type: 'number', description: 'Porcentaje del costo total que pone el inversor (0–100). Default 60. El resto lo financia el banco al 11% anual.' },
          velocidad_ventas_mensual: { type: 'number', description: 'Departamentos vendidos por mes. 0 = usar promedio del distrito.' },
          mezcla_tipologias: {
            type: 'array',
            description: 'Mezcla de tipos de departamento. Si el usuario definió la tipología del producto.',
            items: {
              type: 'object',
              properties: {
                tipo: { type: 'string', description: 'studio | 1_dorm | 2_dorm | 3_dorm' },
                porcentaje: { type: 'number', description: '% de unidades de este tipo (0–100). Todos deben sumar 100.' },
                precio_usd_m2: { type: 'number', description: 'Precio de venta en USD/m² para este tipo.' },
              },
              required: ['tipo', 'porcentaje', 'precio_usd_m2'],
            },
          },
          luz_tipica: { type: 'number', description: 'Luz libre entre columnas en metros. Default: 5.0' },
        },
        required: [
          'area_total', 'distrito', 'pisos_max',
          'retiro_frontal', 'retiro_lateral', 'retiro_posterior',
          'cus', 'area_min_depto', 'estacionamientos',
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

    // Construir el último mensaje del usuario — puede incluir archivo adjunto puntual
    const lastUserContent = await this.buildUserContent(dto)

    // System prompt enriquecido con documentos del proyecto
    const systemPrompt = SYSTEM_PROMPT + contextoDocumentos

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

    if (name === 'buscar_en_base_de_conocimiento') return this.toolBuscarKb(args.query, res)
    if (name === 'consultar_normativa') return this.toolConsultarNormativa(args.distrito, res)
    if (name === 'analisis_completo') return this.toolAnalisisCompleto(args, res, proyectoId)
    if (name === 'generar_pdf') return this.toolGenerarPdf(args, res, proyectoId)

    return { error: `Tool desconocida: ${name}` }
  }

  private async toolBuscarKb(query: string, res: Response): Promise<any> {
    res.write(`event:status\ndata:${JSON.stringify({ step: 'Consultando base de conocimiento...', icon: 'search' })}\n\n`)
    try {
      const results = await this.kb.search(query, 5)
      const relevantes = results.filter(r => r.similarity > 0.35)
      this.logger.log(`KB tool "${query.slice(0, 50)}": ${results.length} resultados, ${relevantes.length} relevantes`)
      if (relevantes.length === 0) {
        return { encontrado: false, mensaje: 'No se encontró información relevante en los documentos internos para esta consulta.' }
      }
      return {
        encontrado: true,
        fuentes: relevantes.map(r => ({
          documento: r.documento_nombre,
          contenido: r.contenido,
          relevancia: r.similarity,
        })),
      }
    } catch (err: any) {
      this.logger.warn(`KB tool error: ${err?.message}`)
      return { error: `Error consultando base de conocimiento: ${err?.message}` }
    }
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

      // ── Paso 3: Financiero (modelo realista) ───────────────────────────────
      res.write(`event:status\ndata:${JSON.stringify({ step: 'Modelando flujo de caja y TIR...', icon: 'chart' })}\n\n`)
      const financiero = await this.motores.financiero({
        distrito: args.distrito,
        area_vendible_m2: cabida.area_vendible_total,
        area_construida_m2: cabida.area_construida_bruta,
        num_departamentos: cabida.num_departamentos,
        precio_terreno_usd: args.precio_terreno_usd ?? 0,
        precio_venta_usd_m2: args.precio_venta_usd_m2 ?? 0,
        area_demolicion_m2: args.area_demolicion_m2 ?? 0,
        porcentaje_capital_propio: args.porcentaje_capital_propio ?? 60,
        velocidad_ventas_mensual: args.velocidad_ventas_mensual ?? 0,
        mezcla_tipologias: args.mezcla_tipologias ?? null,
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

    let datos = this.analisisPorProyecto.get(proyectoId)

    // Si no está en memoria (reinicio del servidor), leer desde la BD
    if (!datos) {
      const fromDb = await this.analisisService.getByProyecto(proyectoId)
      if (fromDb) {
        datos = {
          distrito: fromDb.distrito,
          cabida: fromDb.cabida,
          estructura: fromDb.estructura,
          financiero: fromDb.financiero,
        }
        this.analisisPorProyecto.set(proyectoId, datos)
      }
    }

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
