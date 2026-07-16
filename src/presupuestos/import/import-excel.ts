import * as ExcelJS from 'exceljs'
import { normalizar } from './matching'

/**
 * Parser FLEXIBLE de un presupuesto en Excel. No asume plantilla fija:
 * - detecta dónde empieza la tabla (salta logos/encabezados),
 * - reconoce columnas por sinónimos de header ("P.U.", "Precio Unitario", "Costo Unit."…),
 * - distingue títulos de partidas (títulos: sin metrado ni P.U.),
 * - maneja merged cells, números como texto, y múltiples niveles de código.
 */

export interface FilaImport {
  fila: number            // fila real en el Excel (1-based)
  esTitulo: boolean
  codigo: string
  descripcion: string
  unidad: string
  metrado: number | null
  precioUnitario: number | null
  parcial: number | null
  nivel: number           // profundidad por el código (01→0, 01.01→1, 01.01.01→2)
}

export interface ParseResultado {
  hoja: string
  columnas: Record<string, number>   // campo lógico → índice de columna (1-based)
  headerFila: number
  filas: FilaImport[]
  advertencias: string[]
}

// Sinónimos de encabezado por campo (orden = prioridad de asignación)
const SINONIMOS: Record<string, string[]> = {
  codigo:         ['codigo', 'item', 'nro', 'no', 'n', 'partida no'],
  descripcion:    ['descripcion', 'partida', 'concepto', 'detalle', 'especificacion'],
  unidad:         ['und', 'unidad', 'um', 'unid', 'u'],
  metrado:        ['metrado', 'metrados', 'cantidad', 'cant'],
  precioUnitario: ['precio unitario', 'precio unit', 'costo unitario', 'costo unit', 'p u', 'pu', 'precio'],
  parcial:        ['parcial', 'importe', 'monto', 'subtotal', 'total'],
}

const FOOTER = new Set(['costo directo', 'gastos generales', 'gasto general', 'utilidad', 'subtotal', 'sub total', 'igv', 'total', 'son', 'presupuesto total'])

/** Valor efectivo de una celda (resuelve merged cells, fórmulas y richText). */
function celdaValor(ws: ExcelJS.Worksheet, r: number, col: number): any {
  const c = ws.getCell(r, col)
  const v: any = c.isMerged && c.master ? c.master.value : c.value
  if (v && typeof v === 'object') {
    if ('result' in v) return (v as any).result
    if ('richText' in v) return (v as any).richText.map((t: any) => t.text).join('')
    if ('text' in v) return (v as any).text
    if (v instanceof Date) return v
  }
  return v
}

/** Convierte a número tolerando "1,300.00", "S/ 42,285.60", vacíos y texto. */
export function parseNum(v: any): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).replace(/[^\d.,\-]/g, '').replace(/,/g, '')
  if (!s || s === '-' || s === '.') return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function texto(v: any): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

export async function parseExcelPresupuesto(buffer: Buffer): Promise<ParseResultado> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)
  const advertencias: string[] = []

  // Elegir hoja: preferir una llamada resumen/presupuesto; si no, la primera con contenido.
  const hojas = wb.worksheets.filter((w) => w.rowCount > 1)
  const ws = hojas.find((w) => /resumen|presupuesto/i.test(w.name)) ?? hojas[0]
  if (!ws) throw new Error('El archivo no tiene ninguna hoja con datos.')

  const maxCol = Math.min(ws.columnCount || 20, 30)
  const maxRow = Math.min(ws.rowCount || 500, 5000)

  // 1) Detectar la fila de encabezados (busca "descripción" + al menos una columna de números).
  let headerFila = -1
  for (let r = 1; r <= Math.min(maxRow, 40); r++) {
    const textos: string[] = []
    for (let c = 1; c <= maxCol; c++) textos.push(normalizar(texto(celdaValor(ws, r, c))))
    const tieneDesc = textos.some((t) => SINONIMOS.descripcion.some((s) => t === s || t.includes(s)))
    const tieneNum = textos.some((t) => [...SINONIMOS.metrado, ...SINONIMOS.precioUnitario, ...SINONIMOS.parcial].some((s) => t === s || t.includes(s)))
    if (tieneDesc && tieneNum) { headerFila = r; break }
  }
  if (headerFila < 0) throw new Error('No pude detectar la fila de encabezados (Descripción / Metrado / P.U. / Parcial).')

  // 2) Mapear columnas por sinónimos (greedy por prioridad, sin repetir columna).
  const headers: { col: number; t: string }[] = []
  for (let c = 1; c <= maxCol; c++) headers.push({ col: c, t: normalizar(texto(celdaValor(ws, headerFila, c))) })
  const columnas: Record<string, number> = {}
  const usadas = new Set<number>()
  const score = (t: string, syns: string[]) => {
    let best = 0
    for (const s of syns) {
      if (t === s) best = Math.max(best, 3)
      else if (t.startsWith(s)) best = Math.max(best, 2)
      else if (t.includes(s)) best = Math.max(best, 1)
    }
    return best
  }
  for (const campo of Object.keys(SINONIMOS)) {
    let mejorCol = -1, mejorScore = 0
    for (const h of headers) {
      if (usadas.has(h.col) || !h.t) continue
      const sc = score(h.t, SINONIMOS[campo])
      if (sc > mejorScore) { mejorScore = sc; mejorCol = h.col }
    }
    if (mejorCol > 0) { columnas[campo] = mejorCol; usadas.add(mejorCol) }
  }
  if (!columnas.descripcion) throw new Error('No encontré la columna de Descripción.')
  if (!columnas.metrado && !columnas.precioUnitario && !columnas.parcial) {
    throw new Error('No encontré columnas de Metrado / P.U. / Parcial.')
  }

  // 3) Leer filas de datos.
  const filas: FilaImport[] = []
  for (let r = headerFila + 1; r <= maxRow; r++) {
    const codigo = texto(celdaValor(ws, r, columnas.codigo ?? 0))
    const descripcion = texto(celdaValor(ws, r, columnas.descripcion))
    if (!codigo && !descripcion) continue // fila vacía

    const normDesc = normalizar(descripcion), normCod = normalizar(codigo)
    if (FOOTER.has(normDesc) || FOOTER.has(normCod) || [...FOOTER].some((f) => normDesc.startsWith(f + ' ') || normCod.startsWith(f))) continue // pie (totales)

    const metrado = columnas.metrado ? parseNum(celdaValor(ws, r, columnas.metrado)) : null
    const precioUnitario = columnas.precioUnitario ? parseNum(celdaValor(ws, r, columnas.precioUnitario)) : null
    const parcial = columnas.parcial ? parseNum(celdaValor(ws, r, columnas.parcial)) : null

    // Nota/comentario suelto: sin código, sin números → lo saltamos con aviso.
    if (!codigo && metrado == null && precioUnitario == null && parcial == null && descripcion.length < 4) continue

    const esTitulo = metrado == null && precioUnitario == null
    const nivel = codigo ? (codigo.match(/\./g) || []).length : 0
    filas.push({ fila: r, esTitulo, codigo, descripcion, unidad: texto(celdaValor(ws, r, columnas.unidad ?? 0)), metrado, precioUnitario, parcial, nivel })
  }

  if (filas.length === 0) advertencias.push('No se detectaron partidas debajo del encabezado.')
  const sinCodigo = filas.filter((f) => !f.codigo).length
  if (sinCodigo > 0) advertencias.push(`${sinCodigo} fila(s) sin código: se matchearán solo por descripción.`)

  return { hoja: ws.name, columnas, headerFila, filas, advertencias }
}
