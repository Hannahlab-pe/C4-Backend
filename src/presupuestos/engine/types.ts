import type { Decimal, Numeric } from './precision'

/** Los 4 tipos de recurso = "elementos genéricos" de la fórmula polinómica. */
export type TipoRecurso = 'MO' | 'MAT' | 'EQP' | 'SUB'
export const GENERICOS: TipoRecurso[] = ['MO', 'MAT', 'EQP', 'SUB']

/**
 * Una línea del APU de una partida: apunta a un RECURSO (MO/MAT/EQP/SUB) o a otra PARTIDA
 * (sub-partida compuesta, cuyo costo se resuelve recursivamente).
 */
export interface ApuLinea {
  clase: TipoRecurso | 'PARTIDA'
  /** id del recurso, o id de la sub-partida si clase === 'PARTIDA'. */
  refId: string
  /** MO y EQP rinden por jornada → cantidad = cuadrilla / rendimiento. */
  cuadrilla?: Numeric
  rendimiento?: Numeric
  /** MAT, SUB y sub-partidas: consumo fijo por unidad de la partida. */
  cantidad?: Numeric
}

/** Definición mínima de una partida para el motor: su id y su APU. */
export interface PartidaDef {
  id: string
  apu: ApuLinea[]
}

/**
 * Contexto de cálculo. El PRECIO vive solo en el Recurso (fuente única de verdad); el motor lo
 * lee en vivo. La resolución de partidas permite la recursión de sub-partidas.
 */
export interface CalcContext {
  /** Precio unitario ACTUAL del recurso (de la tabla maestra de Recursos). */
  precioRecurso: (recursoId: string) => Numeric
  /** Definición de una partida (para expandir sub-partidas). */
  partida: (partidaId: string) => PartidaDef | undefined
}

export interface ApuLineaCalc {
  clase: TipoRecurso | 'PARTIDA'
  refId: string
  cantidad: Decimal        // 4 dec
  precioUnitario: Decimal  // precio del recurso, o costo unitario de la sub-partida
  parcial: Decimal         // 2 dec (para mostrar)
}

export interface ApuResultado {
  costoUnitario: Decimal                       // 2 dec
  lineas: ApuLineaCalc[]
  /** Desglose del costo unitario por genérico (MO/MAT/EQP/SUB), YA expandiendo sub-partidas. */
  porGenerico: Record<TipoRecurso, Decimal>
}

// ── Presupuesto (árbol WBS) ──
export interface ItemDef {
  id: string
  parentId?: string | null
  tipo: 'titulo' | 'partida'
  /** Solo partida: metrado físico. */
  metrado?: Numeric
  /** Solo partida: costo unitario SNAPSHOT (tomado del APU al agregar/recalcular). */
  costoUnitario?: Numeric
  /** Desglose por genérico del costo unitario snapshot (para coeficientes de incidencia). */
  porGenerico?: Partial<Record<TipoRecurso, Numeric>>
}

/** Porcentajes como FRACCIÓN (0.10 = 10%, 0.18 = IGV). Configurable por proyecto. */
export interface ConfigPresupuesto {
  ggFijo?: Numeric
  ggPorcentaje?: Numeric
  utilidadPorcentaje?: Numeric
  igvPorcentaje?: Numeric // default 0.18
}

export interface PresupuestoResultado {
  parciales: Record<string, number>   // parcial por item id (2 dec)
  subtotales: Record<string, number>  // subtotal por título id (2 dec)
  costoDirecto: number
  gastosGenerales: number
  utilidad: number
  subtotal: number
  igv: number
  total: number
  /** Σ por genérico en todo el presupuesto (metrado-ponderado). Para la polinómica. */
  porGenerico: Record<TipoRecurso, number>
}
