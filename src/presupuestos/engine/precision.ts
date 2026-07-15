import Decimal from 'decimal.js'

/**
 * REGLA DE PRECISIÓN ÚNICA DEL MÓDULO DE PRESUPUESTOS (documentada — punto crítico).
 *
 * Los ERP de costos del rubro fallan por "redondeo acumulado". Para evitarlo, en C4:
 *  1. TODO cálculo intermedio usa Decimal (aritmética decimal exacta, sin float64).
 *  2. NUNCA se redondea un resultado intermedio antes de sumarlo — las sumas (Σ parciales,
 *     subtotales) se acumulan con precisión completa.
 *  3. Se redondea SOLO en la frontera de guardado/visualización:
 *       - CANTIDADES  → 4 decimales (ej. jornales/m2 = 0.0833)
 *       - MONTOS (S/) → 2 decimales
 *  4. Redondeo comercial HALF_UP (0.5 sube).
 *
 * Excepción de diseño: la CANTIDAD de una línea de APU se redondea a 4 decimales porque es un
 * campo persistido con esa precisión definida (así lo hace el rubro); el parcial se calcula con
 * esa cantidad de 4 dec, pero los parciales se SUMAN sin redondear y el costo unitario se redondea
 * solo al final.
 */
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }
export type Numeric = number | string | Decimal

/** Crea un Decimal seguro (null/undefined/'' → 0). */
export const D = (x: Numeric | null | undefined): Decimal =>
  new Decimal(x === null || x === undefined || x === '' ? 0 : x)

export const DEC_CANTIDAD = 4
export const DEC_MONTO = 2

/** Redondea una CANTIDAD a 4 decimales (frontera de guardado/visualización). */
export const qty = (x: Numeric): Decimal => D(x).toDecimalPlaces(DEC_CANTIDAD, Decimal.ROUND_HALF_UP)

/** Redondea un MONTO en soles a 2 decimales (frontera de guardado/visualización). */
export const money = (x: Numeric): Decimal => D(x).toDecimalPlaces(DEC_MONTO, Decimal.ROUND_HALF_UP)

/** Convierte a number (para serializar en JSON de la API). Usar solo en la frontera. */
export const n = (x: Decimal): number => x.toNumber()
