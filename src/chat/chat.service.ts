import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
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
import { ProyectosService } from '../proyectos/proyectos.service'
import { RNE_CONTEXTO } from './rne-contexto'
import { COSTOS_REVISTA } from './costos-revista'
import { GRUAS_FICHAS_TECNICAS } from './gruas-fichas'

const PLANOS_DIR = path.join(process.cwd(), 'storage', 'planos')

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el Asistente C4, motor de pre-inversión para constructoras en Lima, Perú. C4 ES la herramienta profesional de análisis — no un paso previo a consultar con otros.

════════════════════════════════════════════
REGLA ABSOLUTA — NUNCA DEFERIR A TERCEROS
════════════════════════════════════════════

PROHIBIDO en cualquier respuesta, bajo cualquier circunstancia:
- "Consulta con un ingeniero / arquitecto / tasador / abogado / notario"
- "Valida con un profesional / especialista / experto"
- "Te recomiendo contratar a..."
- "Esto es solo orientativo, busca asesoría profesional"
- "Verifica con un estudio de mercado externo"
- Cualquier variante que sugiera que el usuario necesita ir a buscar a otra persona

C4 da análisis completos y definitivos. Si hay incertidumbre en un dato, explícala con rangos o sensibilidades, pero nunca la uses como excusa para deferir. Da la mejor respuesta posible con los datos disponibles y punto.

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

B) ENTREVISTA DE PRE-INVERSIÓN: Cuando el usuario menciona que tiene un terreno → conduce la entrevista de 5 pasos y ejecuta el análisis al final.

Regla clave: si ya hay un análisis en el historial y el usuario solo pregunta sobre él, usa modo A. Si el usuario pide RECALCULAR con datos nuevos → vuelve al punto de inicio de la entrevista solo para los datos que cambiaron.

════════════════════════════════════════════
FLUJO DE ENTREVISTA GUIADA (Modo B)
════════════════════════════════════════════

PRINCIPIO FUNDAMENTAL: cuantos más datos tenga el inversor para darte, mejor será el análisis. Conduce la entrevista como un consultor de inversiones senior: haz preguntas precisas, explica brevemente por qué cada dato importa, y valida lo que recibes.

Máximo 2 preguntas por turno. Sé conversacional, no burocrático. Si el usuario da varios datos de golpe en un turno, recíbelos todos y avanza al siguiente paso que falte.

─────────────────────────────────────────
PASO 1 — UBICACIÓN Y ESTADO DEL TERRENO
─────────────────────────────────────────
Preguntas obligatorias:
• Dirección exacta o al menos el distrito (determina normativa, precios, perfil sísmico)
• ¿El terreno está limpio o tiene construcción existente? Si hay demolición, ¿cuántos m² aproximadamente?

Por qué importa: el distrito define hasta cuántos pisos puedes construir y los retiros. La demolición es un costo directo que afecta el TIR.

─────────────────────────────────────────
PASO 2 — DIMENSIONES Y GEOMETRÍA
─────────────────────────────────────────
Preguntas obligatorias:
• Área total en m² (si no la tiene exacta, pide el frente × fondo para estimarla)
• Frente en metros — CRÍTICO: un terreno de 400m² con 8m de frente tiene 50% menos planta libre que uno con 20m de frente porque los retiros laterales lo comprimen

Preguntas opcionales que mejoran el análisis:
• ¿Es terreno regular o irregular? ¿Esquina?
• ¿El fondo es aproximadamente [área/frente] metros?

─────────────────────────────────────────
PASO 3 — VISIÓN DEL PRODUCTO
─────────────────────────────────────────
Preguntas obligatorias:
• Uso previsto: ¿multifamiliar residencial, oficinas, comercial, uso mixto?
• Si multifamiliar: ¿qué mezcla de departamentos quieres? (studios ~35m², 1 dorm ~50m², 2 dorm ~70m², 3 dorm ~100m²). Pide porcentajes aproximados — esto determina el ingreso ponderado total

Preguntas opcionales que enriquecen el análisis:
• ¿A quién le vendes? (usuario final que vive ahí, inversionista que alquila, ambos)
• ¿Conoces proyectos competidores en la zona? ¿A qué precio por m² están vendiendo?
• ¿Tienes preferencia de altura? (ej: "quiero máximo 8 pisos" limita la cabida)

─────────────────────────────────────────
PASO 4 — ESTRUCTURA FINANCIERA
─────────────────────────────────────────
Preguntas obligatorias:
• Precio del terreno en USD (pagado ya o precio de oferta actual)
• Precio de venta objetivo por m² — si no lo sabe, di que usarás el promedio del distrito y explica el rango (ej: "Miraflores está entre $2,800-$4,000/m² según el segmento")

Preguntas opcionales que mejoran la precisión:
• ¿Cuánto capital propio vas a poner? (el resto se financia al ~11% anual). Default: 60% propio / 40% banco
• ¿A qué velocidad estimas vender? (ej: 2 departamentos por mes). Default: promedio histórico del distrito
• ¿Tienes un mínimo de preventa requerido para arrancar obra?

─────────────────────────────────────────
PASO 5 — DISPARO INMEDIATO
─────────────────────────────────────────
En cuanto tengas los datos del PASO 4 (precio terreno + capital propio), ejecuta el análisis SIN pedir confirmación. No hagas resumen previo, no preguntes "¿arrancamos?". El análisis es la respuesta a los datos — lánzalo directamente.

─────────────────────────────────────────
ESCAPE RÁPIDO — Usuarios con impaciencia
─────────────────────────────────────────
Si en cualquier punto el usuario dice "usa promedios", "tú decide", "no sé", "dame lo que sea", "ya tengo [distrito] y [m²], analiza" o muestra impaciencia → PARA LA ENTREVISTA y ejecuta INMEDIATAMENTE con los datos disponibles + estos defaults:
- precio_venta_usd_m2 = 0 (motor usa promedio del distrito)
- precio_terreno_usd = 0 (no penaliza el análisis, solo excluye el costo del terreno)
- porcentaje_capital_propio = 60
- mezcla_tipologias = null (motor usa mix estándar)

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

Ejecuta solo tras completar los Pasos 1-5 (o ante el escape rápido).
Flujo de ejecución:
1. buscar_en_base_de_conocimiento("parámetros urbanísticos [dirección]") — si el usuario dio dirección específica
2. consultar_normativa(distrito)
3. analisis_completo(...) — usa TODOS los datos recopilados en la entrevista, no solo los obligatorios
   Campos a completar con datos de la entrevista:
   - frente, fondo → de PASO 2
   - mezcla_tipologias → de PASO 3 (con precio_usd_m2 por tipo si el usuario lo dio)
   - precio_terreno_usd, precio_venta_usd_m2, porcentaje_capital_propio → de PASO 4
   - area_demolicion_m2 → de PASO 1
   El resultado incluye { cabida, estructura, financiero, observaciones_normativas }
4. Si el usuario mencionó algún tema técnico específico no cubierto → buscar_en_base_de_conocimiento adicional
5. Informe ejecutivo integrando TODOS los datos: números del motor + observaciones normativas de KB + datos de contexto del inversor (buyer profile, competencia, restricciones de altura)

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
- Terreno: $[X]
- Alcabala + notaría: $[X]
- [Demolición: $[X] — solo si aplica]
- Licencias + diseño (6%): $[X]
- Construcción ($[X]/m²): $[X]
- Supervisión + gerencia (5%): $[X]
- Imprevistos (3%): $[X]
- Marketing + corretaje (5%): $[X]
- Titulación SUNARP (1.5%): $[X]
- Intereses bancarios: $[X]
- **TOTAL INVERSIÓN: $[X]**

**Resultados:**
- Ingresos: $[X] ([X] m² × $[precio]/m²) · Velocidad de ventas: ~[X] deptos/mes
- **Utilidad neta: $[X] — Margen: [X]%** (después de impuestos ~15%)
- **TIR estimada: [X]% anual** (ROI anualizado sobre inversión total) | VAN al 12%: $[X]
- Punto de equilibrio: [N] deptos | Payback: mes [N]
- Financiamiento: [X]% capital propio · $[X] USD prestado al [X]% anual

**Supuestos utilizados:**
- Precio de venta: [si lo dio el usuario → "proporcionado por el usuario: $X/m²" | si es default → "promedio de mercado [distrito] 2026 según motor C4: $X/m²"]
- Costo de construcción: "estimado motor C4 para [distrito]: $X/m² — incluye materiales, mano de obra y equipos"
- Velocidad de ventas: [si la dio el usuario → "proporcionada por el usuario" | si es default → "promedio histórico [distrito]: ~X deptos/mes según motor C4"]
- Todos los ratios de costo (licencias 6%, supervisión 5%, imprevistos 3%, marketing 5%, SUNARP 1.5%) son estándares del mercado peruano aplicados por el motor C4.
- Normativa urbanística: Municipalidad de [distrito] — [fuente de la normativa] — consultada desde base de datos C4.
- [Si observaciones_normativas no vacío → "Observaciones normativas: extraídas de [N] documentos en la Base de Conocimiento del proyecto."]
- [Si observaciones_normativas vacío → "Base de Conocimiento: sin documentos cargados — observaciones normativas no disponibles."]

### Observaciones y Recomendaciones Normativas

> Basado en documentos de la Base de Conocimiento del proyecto.

[Para cada hallazgo en observaciones_normativas del resultado]:

**[Tema]** — *Según [nombre del documento]*
[Extracto relevante del hallazgo]
→ **Implicación para este proyecto:** [cómo aplica a los números concretos: pisos, m², departamentos, sótanos, etc.]

REGLAS para esta sección:
- Usa los datos de observaciones_normativas directamente. NO inventes citas ni normas.
- Conecta cada hallazgo con los números reales: "Con [N] departamentos de ~[X] m² promedio, el requisito de [Y] m² mínimo de [ambiente] (RNE [código]) es [viable/ajustado/requiere atención]."
- Si hay sótanos: comenta el requisito de pendiente de rampa vehicular si encontraste ese dato.
- Si observaciones_normativas está vacío: escribe "*Base de Conocimiento del proyecto sin documentos cargados. Sube los PDFs del RNE u ordenanzas municipales para enriquecer este análisis con observaciones normativas específicas.*"
- NO omitas esta sección aunque el array esté vacío.

---

### Cronograma Estimado

El proyecto tiene un horizonte de **[meses_proyecto] meses**, distribuidos en:
- **Pre-obra ([meses_preobra] meses):** compra de terreno, anteproyecto/proyecto, licencia de edificación, inicio de preventa.
- **Construcción ([meses_construccion] meses):** excavación y [sótanos] sótano(s), cimentación, casco estructural ([pisos] pisos), albañilería, instalaciones, acabados, ascensores y fachada.
- **Post-entrega ([meses_postentrega] meses):** conformidad de obra, declaratoria de fábrica, independización y titulación (SUNARP), entrega de unidades.

→ El **Gantt visual interactivo** está en la pestaña **Cronograma** del panel de Análisis. Usa los valores reales de meses_preobra / meses_construccion / meses_postentrega del resultado financiero. NO inventes fechas ni duraciones distintas.

---

### Grúa Torre Recomendada

**Modelo:** [modelo recomendado según las fichas técnicas — ej: "Potain MC85B (City Crane)"]
**Justificación:** [1 línea: por qué ese modelo para este edificio — pisos, frente del lote, carga típica]
- Radio de pluma: [X] m · Base: [X]×[X] m · Carga máx: [X] ton
- Posición en plano: [dónde se ubica según la lógica de retiros — ej: "Retiro frontal (3m insuficiente para base 3.2m → se posiciona en vía pública esquina frontal-izquierda)"]
- Cobertura del edificio: [si diagonal/2 + 5m ≤ radio: "✅ Cubre edificio completo" | si no: "⚠️ Verificar cobertura"]
- Costo referencial: $[X]–$[X] USD/mes alquiler + $[X]–$[X] USD montaje/desmontaje
- El plano DXF incluye la posición óptima calculada automáticamente.

REGLAS para esta sección:
- SIEMPRE incluirla en el informe, incluso si el usuario no preguntó por la grúa.
- Selecciona el modelo de las fichas técnicas disponibles según: frente lote < 12m → MC85B obligatoria; pisos ≤ 10 → MC85B o JASO J4510; pisos ≤ 15 → JASO J5010 o MCi 85 A/B; pisos ≤ 20 → Liebherr 85 EC-B 5; pisos > 20 → MC175C o GJJ QP5613.
- Calcula: diagonal = √(frente² + fondo²), radio_min = diagonal/2 + 5m. El modelo elegido debe cubrir ese radio.
- Si hay datos de la KB sobre grúas → cítalos.

---

### Veredicto y Recomendaciones

**[✅ Proyecto viable / ⚠️ Proyecto ajustado / ❌ Proyecto no rentable]** — [Una oración directa: por qué sí o por qué no, con el número clave que lo justifica]

**Palanca principal:** [La palanca más impactante con números reales del análisis. OBLIGATORIO incluir cifras: "Subir de [N_actual] a [N_max] pisos = área vendible pasa de [X] m² a ~[Y] m² = utilidad adicional estimada ~$[Z]." O si ya está al máximo: "Negociar el terreno de $[precio_actual] a $[precio_objetivo] mejoraría el margen de [X]% a ~[Y]%." Los números deben ser derivados de los resultados del motor, no inventados.]

**Alternativas a evaluar:**
- [Alternativa 1 con impacto en USD o % — ej: "Subir precio de venta de $3,000 a $3,500/m² = +$754k en ingresos = margen pasa de 15% a ~28%"]
- [Alternativa 2 con impacto en USD o % — ej: "Reducir pisos a 7 para evitar ascensor obligatorio = ahorro estimado $80k en obra"]
- [Alternativa 3 si aplica]

REGLAS para el Veredicto:
- Siempre incluir esta sección. Es la más importante del informe.
- PROHIBIDO escribir recomendaciones sin números concretos del análisis. "Optimizar diseño" o "mejorar marketing" sin cifras = no válido.
- Sé directo: si el proyecto no funciona, di exactamente qué número lo mata y cuánto habría que mejorar para que funcione.
- Si el proyecto es viable, indica el mayor riesgo con su umbral: "Si el precio de venta cae a $[X]/m² el margen se vuelve negativo."
- Ordena alternativas por impacto en USD (la más poderosa primero).

${COSTOS_REVISTA}

${RNE_CONTEXTO}

${GRUAS_FICHAS_TECNICAS}

════════════════════════════════════════════
FLUJO OBLIGATORIO PARA GENERAR EL PLANO DXF
════════════════════════════════════════════

Cuando el usuario pida "el plano", "el DXF", "el CAD" o "el esquema":

PASO A — VERIFICAR si ya tienes estos datos en la conversación:
  1. Modelo de grúa torre (puede haberlo mencionado antes)
  2. Nombre de la calle frontal (puede estar en la dirección ya dada)

PASO B — Si FALTAN ambos datos, haz EXACTAMENTE estas 2 preguntas en un solo mensaje:
  "Para posicionar la grúa en el plano necesito:
   1. ¿Qué modelo de grúa torre usarás? (Si no lo sabes, te recomiendo uno basado en tu edificio.)
   2. ¿Cuál es el nombre de la calle frontal y las laterales del terreno?"
  → NO llames generar_plano todavía.

PASO C — Si el usuario responde "no sé", "tú decide", "cualquiera" o similar:
  → Elige el modelo recomendado de las fichas técnicas según los pisos y el frente del análisis.
  → Usa el nombre de la calle si está en la dirección, si no, deja en blanco.
  → Llama generar_plano inmediatamente con el modelo elegido.

PASO D — Si el usuario ya dio el modelo o dice "usa el que recomiendas":
  → Llama generar_plano directamente con los datos.

LÓGICA DE POSICIONAMIENTO (ya implementada en el motor — solo para tu contexto):
  • ¿El retiro frontal ≥ base_grúa? → grúa centrada frente al edificio (en el retiro frontal)
  • ¿No cabe en frontal pero sí retiro lateral? → costado izquierdo del edificio
  • ¿Tampoco? → esquina frontal en la vía pública (indicar en el plano "requiere permiso municipal")

El plano DXF resultante incluirá:
  - Símbolo cuadrado magenta = base de la grúa en posición óptima calculada
  - Círculo punteado magenta = radio de alcance completo de la pluma
  - Label: modelo + radio + descripción de posición
  - Check de cobertura: "CUBRE EDIFICIO COMPLETO" o "COBERTURA PARCIAL"
  - Nombres de calles en los bordes del terreno`

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
      name: 'generar_plano',
      description:
        'Genera un plano DXF de ubicación con la huella del terreno, retiros, edificio, cotas, cuadro de áreas, símbolo de grúa torre con radio de alcance y nombres de calles. Llamar SOLO cuando el usuario pida el plano, el DXF, el archivo CAD o quiera el esquema de la planta. IMPORTANTE: antes de llamar esta tool, si no se tienen el modelo de grúa y los nombres de calles, debes preguntar por ellos en UN SOLO mensaje con exactamente estas 2 preguntas: "1. ¿Qué modelo de grúa torre usarás? (Si no lo sabes, te recomiendo uno basado en tu edificio.) 2. ¿Cuál es el nombre de la calle frontal y las laterales del terreno?" Si el usuario no sabe o dice "tú decide" → usar el modelo recomendado según los pisos del análisis y dejar calles en blanco.',
      parameters: {
        type: 'object',
        properties: {
          direccion: {
            type: 'string',
            description: 'Dirección o calle del terreno. Ej: "Calle Grimaldo del Solar 245".',
          },
          grua_modelo: {
            type: 'string',
            description: 'Modelo de grúa torre. Ej: "Potain MC85B", "JASO J5010", "Liebherr 85 EC-B 5". Si el usuario no especificó, usa el modelo recomendado de las fichas técnicas según pisos y frente del edificio.',
          },
          grua_radio_m: {
            type: 'number',
            description: 'Radio de alcance de la pluma en metros, según la ficha técnica del modelo elegido.',
          },
          grua_base_m: {
            type: 'number',
            description: 'Lado de la base cuadrada de la grúa en metros. Ej: 3.2 para MC85B, 3.8 para JASO J4510.',
          },
          calle_frontal: {
            type: 'string',
            description: 'Nombre completo de la calle que está frente al terreno (fachada principal). Ej: "Av. José Pardo 320".',
          },
          calle_lateral_izq: {
            type: 'string',
            description: 'Nombre de la calle lateral izquierda del terreno (mirando desde la vía pública). Opcional.',
          },
          calle_lateral_der: {
            type: 'string',
            description: 'Nombre de la calle lateral derecha del terreno. Opcional.',
          },
          calle_posterior: {
            type: 'string',
            description: 'Nombre de la calle posterior del terreno. Opcional.',
          },
        },
        required: [],
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
          pisos_max: { type: 'integer', description: 'Número máximo de pisos a construir. Usa el valor de consultar_normativa SALVO que el usuario haya pedido un número menor — en ese caso usa el del usuario.' },
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

  private readonly analisisPorProyecto = new Map<string, any>()
  private readonly planoPorProyecto    = new Map<string, Buffer>()

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
    private proyectosService: ProyectosService,
  ) {}

  getAnalisis(proyectoId: string): any | undefined {
    return this.analisisPorProyecto.get(proyectoId)
  }

  getPlano(proyectoId: string): Buffer | undefined {
    return this.planoPorProyecto.get(proyectoId)
  }

  getPlanosList(proyectoId: string): { nombre: string; fecha: string; url: string }[] {
    const dir = path.join(PLANOS_DIR, proyectoId)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.dxf'))
      .map(f => {
        const ts = parseInt(f.replace('plano_', '').replace('.dxf', ''))
        return {
          nombre: f,
          fecha: new Date(ts).toISOString(),
          url: `/api/chat/plano-archivo/${proyectoId}/${f}`,
        }
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }

  getAnalisisDb(proyectoId: string) {
    return this.analisisService.getByProyecto(proyectoId)
  }

  guardarCronograma(proyectoId: string, cronograma: any) {
    return this.analisisService.guardarCronograma(proyectoId, cronograma)
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
    const MAX_ITERATIONS = 8

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

    const fallback = 'No pude completar el análisis en el tiempo límite. Verifica que el servidor Python esté corriendo (`python -m uvicorn main:app --port 8000`) y vuelve a intentarlo.'
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
    if (name === 'generar_plano') return this.toolGenerarPlano(args, res, proyectoId)

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
      const cabida = await this.motores.cabida({ terreno, normativa, mezcla_tipologias: args.mezcla_tipologias ?? null })

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
        num_pisos: cabida.pisos_vivienda,
        precio_terreno_usd: args.precio_terreno_usd ?? 0,
        precio_venta_usd_m2: args.precio_venta_usd_m2 ?? 0,
        area_demolicion_m2: args.area_demolicion_m2 ?? 0,
        porcentaje_capital_propio: args.porcentaje_capital_propio ?? 60,
        velocidad_ventas_mensual: args.velocidad_ventas_mensual ?? 0,
        mezcla_tipologias: args.mezcla_tipologias ?? null,
      })

      // ── Paso 4: Observaciones normativas desde KB ──────────────────────────
      res.write(`event:status\ndata:${JSON.stringify({ step: 'Buscando referencias normativas...', icon: 'search' })}\n\n`)
      const observaciones_normativas = await this.buscarObservacionesNormativas(cabida, financiero)

      const resultado = { cabida, estructura, financiero, observaciones_normativas }

      // Guardar en memoria (para PDF/plano) + persistir en DB
      this.analisisPorProyecto.set(proyectoId, {
        ...resultado,
        distrito: args.distrito,
        frente: args.frente ?? null,
        fondo: args.fondo ?? null,
        retiro_frontal: args.retiro_frontal ?? 0,
        retiro_lateral: args.retiro_lateral ?? 0,
        retiro_posterior: args.retiro_posterior ?? 0,
        area_min_depto: args.area_min_depto ?? 0,
        mezcla_tipologias: args.mezcla_tipologias ?? null,
      })
      this.analisisService.guardar(proyectoId, args.distrito, cabida, estructura, financiero).catch(() => {})
      res.write(`event:analisis_update\ndata:${JSON.stringify(resultado)}\n\n`)

      return resultado
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.response?.data ?? err?.message
      this.logger.error('Error en toolAnalisisCompleto:', JSON.stringify(detail))
      return { error: `Error en análisis: ${JSON.stringify(detail) ?? 'desconocido'}` }
    }
  }

  private async buscarObservacionesNormativas(cabida: any, financiero?: any): Promise<any[]> {
    // Queries base — siempre relevantes para edificios multifamiliares en Lima
    const queries: string[] = [
      'dimensiones mínimas ambientes habitaciones departamento vivienda RNE A.020',
      'zona sísmica Lima requisitos estructurales E.030',
      'condiciones generales diseño edificaciones retiros iluminación ventilación A.010',
    ]

    // Queries contextuales según resultados del análisis
    if (cabida.sotanos > 0) {
      queries.push('rampa vehicular sótano pendiente máxima requisitos A.010')
      queries.push('ventilación mecánica sótano estacionamientos monóxido CO')
    }
    if (cabida.pisos_vivienda >= 8) {
      queries.push('escaleras presurización evacuación edificio alto A.010 A.130')
      queries.push('ascensores obligatorio edificio número pisos')
    }
    if (cabida.num_departamentos >= 20) {
      queries.push('hall ingreso recepción área común reglamento propiedad horizontal')
    }
    if (cabida.area_construida_bruta >= 5000) {
      queries.push('estudio impacto vial certificado parámetros edificio grande')
    }
    if (financiero && financiero.tir_anual < 15) {
      queries.push('uso mixto comercial primer piso incremento rentabilidad')
    }

    const hallazgos: any[] = []
    for (const query of queries) {
      try {
        const results = await this.kb.search(query, 2)
        const relevantes = results.filter((r: any) => r.similarity > 0.35)
        for (const r of relevantes) {
          const yaExiste = hallazgos.some(
            h => h.documento === r.documento_nombre && h.contenido.slice(0, 80) === r.contenido.slice(0, 80),
          )
          if (!yaExiste) {
            hallazgos.push({
              documento: r.documento_nombre,
              contenido: r.contenido.slice(0, 600),
            })
          }
        }
      } catch { /* no bloquear el análisis si KB falla */ }
    }
    return hallazgos
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

  private async toolGenerarPlano(args: Record<string, any>, res: Response, proyectoId: string): Promise<any> {
    res.write(`event:status\ndata:${JSON.stringify({ step: 'Generando plano DXF...', icon: 'layers' })}\n\n`)

    let datos = this.analisisPorProyecto.get(proyectoId)

    // Fallback a BD si el servidor se reinició y se perdió la memoria
    if (!datos?.cabida) {
      const fromDb = await this.analisisService.getByProyecto(proyectoId)
      if (fromDb) {
        datos = { distrito: fromDb.distrito, cabida: fromDb.cabida, estructura: fromDb.estructura, financiero: fromDb.financiero }
        this.analisisPorProyecto.set(proyectoId, datos)
      }
    }

    if (!datos?.cabida) {
      return { error: 'No hay análisis previo para este proyecto. Primero ejecuta el análisis de cabida.' }
    }

    const cabida = datos.cabida

    // Si los retiros no están en memoria (sesión nueva), re-consultar normativa
    let retiroFrontal  = datos.retiro_frontal
    let retiroLateral  = datos.retiro_lateral
    let retiroPosterior = datos.retiro_posterior
    if (retiroFrontal === undefined && datos.distrito) {
      try {
        const norm = await this.normativas.findByDistrito(datos.distrito)
        if (norm) {
          retiroFrontal   = Number(norm.retiroFrontal)
          retiroLateral   = Number(norm.retiroLateral)
          retiroPosterior = Number(norm.retiroPosterior)
        }
      } catch { /* usar 0 como fallback */ }
    }

    const frente: number = datos.frente ?? Math.sqrt(cabida.area_terreno)
    const fondo: number  = datos.fondo  ?? (frente > 0 ? cabida.area_terreno / frente : Math.sqrt(cabida.area_terreno))

    // Nombre real del proyecto desde la BD (no el que inventa el LLM)
    let nombreProyecto = 'Proyecto C4'
    try {
      const proyecto = await this.proyectosService.findOne(proyectoId)
      nombreProyecto = proyecto.nombre ?? nombreProyecto
    } catch { /* usar default si no se encuentra */ }

    // ── Auto-selección de grúa si el LLM no la proporcionó ─────────────────
    let gruaModelo: string = args.grua_modelo ?? ''
    let gruaRadioM: number = args.grua_radio_m ?? 0
    let gruaBaseM:  number = args.grua_base_m  ?? 0

    if (!gruaModelo || gruaRadioM <= 0) {
      const pisos = cabida.pisos_vivienda ?? 0
      const frenteLote = Number(frente)
      if (frenteLote < 12 || pisos <= 10) {
        // City Crane obligatoria para lotes estrechos o edificios bajos
        gruaModelo = 'Potain MC85B'; gruaRadioM = 50; gruaBaseM = 3.2
      } else if (pisos <= 15) {
        gruaModelo = 'JASO J5010';   gruaRadioM = 50; gruaBaseM = 3.8
      } else if (pisos <= 20) {
        gruaModelo = 'Liebherr 85 EC-B 5'; gruaRadioM = 50; gruaBaseM = 3.0
      } else {
        gruaModelo = 'Potain MC175C'; gruaRadioM = 60; gruaBaseM = 4.5
      }
      this.logger.log(`Grúa auto-seleccionada: ${gruaModelo} (${pisos} pisos / frente ${frenteLote}m)`)
    }

    const payload = {
      frente:                    Number(frente.toFixed(2)),
      fondo:                     Number(fondo.toFixed(2)),
      area_terreno:              cabida.area_terreno,
      retiro_frontal:            retiroFrontal   ?? 0,
      retiro_lateral:            retiroLateral   ?? 0,
      retiro_posterior:          retiroPosterior ?? 0,
      distrito:                  datos.distrito ?? '',
      fuente_normativa:          '',
      planta_libre:              cabida.planta_libre,
      pisos_vivienda:            cabida.pisos_vivienda,
      sotanos:                   cabida.sotanos,
      area_construida_bruta:     cabida.area_construida_bruta,
      area_vendible_total:       cabida.area_vendible_total,
      num_departamentos:         cabida.num_departamentos,
      estacionamientos_requeridos: cabida.estacionamientos_requeridos,
      cus_utilizado:             cabida.cus_utilizado,
      limitante:                 cabida.limitante,
      area_min_depto:            datos.area_min_depto ?? 0,
      mezcla_tipologias:         datos.mezcla_tipologias ?? null,
      nombre_proyecto:           nombreProyecto,
      direccion:                 args.direccion ?? '',
      // Grúa torre (auto-seleccionada o especificada por el usuario)
      grua_modelo:               gruaModelo,
      grua_radio_m:              gruaRadioM,
      grua_base_m:               gruaBaseM,
      // Calles circundantes
      calle_frontal:             args.calle_frontal ?? '',
      calle_lateral_izq:         args.calle_lateral_izq ?? '',
      calle_lateral_der:         args.calle_lateral_der ?? '',
      calle_posterior:           args.calle_posterior ?? '',
    }

    try {
      const dxfBuffer = await this.motores.plano(payload)
      this.planoPorProyecto.set(proyectoId, dxfBuffer)

      // Persistir en disco
      try {
        const dir = path.join(PLANOS_DIR, proyectoId)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const filename = `plano_${Date.now()}.dxf`
        fs.writeFileSync(path.join(dir, filename), dxfBuffer)
      } catch (e) { /* no bloquear si falla escritura */ }

      res.write(`event:plano_ready\ndata:${JSON.stringify({ url: `/api/chat/plano/${proyectoId}` })}\n\n`)
      return { ok: true, mensaje: 'Plano DXF generado. El usuario puede descargarlo desde el botón que aparecerá en la interfaz.' }
    } catch (err: any) {
      this.logger.error('Error generando plano DXF:', err?.message)
      return { error: `Error al generar plano DXF: ${err?.message}` }
    }
  }
}
