import { D, Decimal, Numeric, n } from './precision'

/** Coeficiente de incidencia de un elemento genérico (a_i). La suma de todos debe ser 1. */
export interface CoefIncidencia { generico: string; a: number }

/** Índices Unificados de Precios (INEI) de un elemento: mes base (o) y mes de reajuste (r). */
export interface IndicePar { generico: string; base: Numeric; actual: Numeric }

/**
 * Coeficiente de reajuste K de la fórmula polinómica (obra pública, Perú):
 *   K = Σ a_i × (Ir_i / Io_i)
 * K se expresa a 3 decimales (norma peruana). Valida que Σ a_i = 1.
 */
export function calcularK(
  coefs: CoefIncidencia[],
  indices: IndicePar[],
): { K: number; sumaCoeficientes: number; coeficientesValidos: boolean } {
  const idx = new Map(indices.map((i) => [i.generico, i]))
  let K = D(0)
  let sumaA = D(0)
  for (const c of coefs) {
    const i = idx.get(c.generico)
    if (!i) throw new Error(`Falta el índice unificado del elemento genérico "${c.generico}".`)
    const io = D(i.base)
    if (io.isZero()) throw new Error(`Índice base (mes de oferta) en 0 para "${c.generico}".`)
    K = K.plus(D(c.a).times(D(i.actual).div(io)))
    sumaA = sumaA.plus(D(c.a))
  }
  return {
    K: n(K.toDecimalPlaces(3, Decimal.ROUND_HALF_UP)),
    sumaCoeficientes: n(sumaA.toDecimalPlaces(3, Decimal.ROUND_HALF_UP)),
    coeficientesValidos: sumaA.toDecimalPlaces(3).equals(1),
  }
}

/**
 * Genera los coeficientes de incidencia a partir del desglose por genérico del presupuesto:
 *   a_i = (costo total del genérico i) / Costo Directo
 * Los redondea a 3 decimales y ajusta el residual en el coeficiente mayor para que sumen EXACTO 1
 * (obligatorio en la norma). Hoy en S10 esto se estima a mano; acá sale de los datos reales del APU.
 */
export function coeficientesIncidencia(
  porGenerico: Record<string, Numeric>,
  costoDirecto: Numeric,
): CoefIncidencia[] {
  const cd = D(costoDirecto)
  const entradas = Object.entries(porGenerico).filter(([, v]) => !D(v).isZero())
  if (cd.isZero() || entradas.length === 0) return []

  const crudos = entradas.map(([g, v]) => ({
    generico: g,
    aExacto: D(v).div(cd),
    a: D(v).div(cd).toDecimalPlaces(3, Decimal.ROUND_HALF_UP),
  }))
  // Ajuste del residual (Σ debe ser 1.000): se le suma/resta al coeficiente más grande.
  const suma = crudos.reduce((s, c) => s.plus(c.a), D(0))
  const residual = D(1).minus(suma)
  if (!residual.isZero()) {
    const mayor = crudos.reduce((a, b) => (b.a.greaterThan(a.a) ? b : a))
    mayor.a = mayor.a.plus(residual)
  }
  return crudos.map((c) => ({ generico: c.generico, a: n(c.a) }))
}
